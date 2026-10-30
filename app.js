/**
 * AP Election GeoPortal - Core Application Engine
 * Interactive GIS Polling Stations, Route Planning & Security Portal
 */

// Global State
const state = {
  data: [],
  filteredData: [],
  currentTab: 'tab-map',
  viewMode: 'cards', // 'cards' or 'table'
  currentPage: 1,
  pageSize: 24,
  sortBy: 'id-asc',
  selectedStation: null,
  activeRoutePolyline: null,
  activeRouteMarkers: [],
  userLocation: null,
  watchId: null,
  lang: 'te', // 'te' (Telugu) or 'en' (English)
  filters: {
    search: '',
    mandal: '',
    mptc: '',
    sensitivity: '',
    route: '',
    police: ''
  },
  charts: {
    sensitivity: null,
    forces: null,
    mandals: null
  }
};

// Bilingual Dictionary
const i18n = {
  te: {
    appTitle: 'AP ఎన్నికల జియోపోర్టల్',
    appSubtitle: 'ఎన్నికల పోలింగ్ కేంద్రాలు, రూట్ మ్యాప్స్ & పోలీస్ బందోబస్తు నిర్వహణ',
    totalPS: 'పోలింగ్ కేంద్రాలు:',
    totalVoters: 'మొత్తం ఓటర్లు:',
    hyperSensitive: 'హైపర్ సెన్సిటివ్:',
    myLocation: 'నా లొకేషన్',
    export: 'ఎక్స్‌పోర్ట్',
    tabMap: 'మ్యాప్ ఎక్స్‌ప్లోరర్',
    tabStations: 'కేంద్రాల జాబితా',
    tabRoutes: 'రూట్ ప్లానర్',
    tabAnalytics: 'విశ్లేషణ & భద్రత',
    tabDirectory: 'పోలీస్ & BLO డైరెక్టరీ',
    allMandals: 'అన్ని మండలాలు (32)',
    allMptc: 'అన్ని MPTC సెగ్మెంట్లు',
    allSensitivity: 'అన్ని రకాల కేంద్రాలు',
    allRoutes: 'అన్ని రూట్లు',
    connectRoute: 'రూట్ లైన్ కనెక్ట్ చేయి',
    clusterMarkers: 'క్లస్టరింగ్',
    legendTitle: 'కేంద్రాల గుర్తులు',
    normal: 'సాధారణ',
    sensitive: 'సెన్సిటివ్',
    userLive: 'మీ లైవ్ లొకేషన్',
    stationsDirectoryTitle: 'పోలింగ్ కేంద్రాల పూర్తి వివరాలు',
    routesPlannerTitle: 'ఎన్నికల రూట్ మ్యాప్ & బందోబస్తు ప్రణాళిక',
    routesPlannerDesc: 'ప్రతి మండలానికి సంబంధించిన రూట్లు, పోలీస్ పెట్రోలింగ్, పోలింగ్ కేంద్రాల వరుస క్రమం',
    analyticsTitle: 'ఎన్నికల గణాంకాలు & భద్రతా విశ్లేషణ డాష్‌బోర్డ్',
    directoryTitle: 'ఎన్నికల అత్యవసర సంప్రదింపులు & పోలీస్ అధికారులు',
    viewOnMap: 'మ్యాప్‌లో చూడు',
    navigateGmaps: 'గూగుల్ మ్యాప్స్ డైరెక్షన్స్',
    callBlo: 'BLOకి కాల్ చేయి',
    callOfficer: 'పోలీస్ అధికారికి కాల్ చేయి',
    routeStops: 'పోలింగ్ కేంద్రాలు'
  },
  en: {
    appTitle: 'AP Election GeoPortal',
    appSubtitle: 'GIS Polling Stations, Route Maps & Security Logistics',
    totalPS: 'Polling Stations:',
    totalVoters: 'Total Voters:',
    hyperSensitive: 'Hyper Sensitive:',
    myLocation: 'My Location',
    export: 'Export CSV',
    tabMap: 'Map Explorer',
    tabStations: 'Stations Directory',
    tabRoutes: 'Route Planner',
    tabAnalytics: 'Analytics & Security',
    tabDirectory: 'Police & BLO Directory',
    allMandals: 'All Mandals (32)',
    allMptc: 'All MPTC Segments',
    allSensitivity: 'All Sensitivity Types',
    allRoutes: 'All Routes',
    connectRoute: 'Connect Route Line',
    clusterMarkers: 'Marker Clustering',
    legendTitle: 'Legend',
    normal: 'Normal',
    sensitive: 'Sensitive',
    userLive: 'Your Live Location',
    stationsDirectoryTitle: 'Polling Stations Complete Directory',
    routesPlannerTitle: 'Election Route Maps & Logistics Plan',
    routesPlannerDesc: 'Sequential routes per Mandal, Police patrolling forces & polling locations',
    analyticsTitle: 'Election Analytics & Security Deployment',
    directoryTitle: 'Emergency Contacts & Police Directory',
    viewOnMap: 'View on Map',
    navigateGmaps: 'Google Maps Directions',
    callBlo: 'Call BLO',
    callOfficer: 'Call Police Officer',
    routeStops: 'Polling Stations'
  }
};

// Map Instance & Layers
let map = null;
let markerClusterGroup = null;
let googleHybridLayer = null;
let googleRoadsLayer = null;
let osmLayer = null;
let esriSatelliteLayer = null;
let activeTileLayer = null;
let userMarker = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  setupEventListeners();
  await loadData();
  populateDropdowns();
  applyFilters();
  initCharts();
});

/**
 * Initialize Leaflet Map with Realtime Satellite & Road Layers
 */
function initMap() {
  // 1. Google Satellite Hybrid (Realtime Satellite + Roads + Village/Town Labels)
  googleHybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Satellite & Roads'
  });

  // 2. Google Maps Standard Road network
  googleRoadsLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  });

  // 3. Official OpenStreetMap (100% Free Open GIS)
  osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  });

  // 4. Esri High-Resolution World Imagery
  esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '&copy; Esri World Imagery'
  });

  // Check saved custom provider from localStorage
  const customTileUrl = localStorage.getItem('custom_map_tile_url');
  let defaultLayer = googleHybridLayer;

  if (customTileUrl) {
    try {
      defaultLayer = L.tileLayer(customTileUrl, { maxZoom: 20 });
    } catch(e) {
      defaultLayer = googleHybridLayer;
    }
  }

  activeTileLayer = defaultLayer;

  // Default center around Srikakulam district AP
  map = L.map('map', {
    center: [18.45, 84.05],
    zoom: 10,
    layers: [activeTileLayer]
  });

  markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
  });
  map.addLayer(markerClusterGroup);

  // Auto-resize triggers to guarantee immediate tile rendering
  setTimeout(() => { if (map) map.invalidateSize(); }, 150);
  setTimeout(() => { if (map) map.invalidateSize(); }, 400);
  setTimeout(() => { if (map) map.invalidateSize(); }, 900);
  window.addEventListener('resize', () => { if (map) map.invalidateSize(); });
}

/**
 * Switch Realtime Map Tile Layer
 */
window.switchMapLayer = function(layerType) {
  if (!map) return;
  map.removeLayer(activeTileLayer);

  const btnHybrid = document.getElementById('btn-layer-hybrid');
  const btnRoads = document.getElementById('btn-layer-roads');
  const btnOsm = document.getElementById('btn-layer-osm');
  const btnEsri = document.getElementById('btn-layer-esri');

  const inactiveClass = 'px-2.5 py-1 text-xs rounded-lg font-medium text-slate-300 hover:text-white transition';
  const activeClass = 'px-2.5 py-1 text-xs rounded-lg font-bold bg-blue-600 text-white shadow transition';

  if (btnHybrid) btnHybrid.className = inactiveClass;
  if (btnRoads) btnRoads.className = inactiveClass;
  if (btnOsm) btnOsm.className = inactiveClass;
  if (btnEsri) btnEsri.className = inactiveClass;

  if (layerType === 'google-hybrid') {
    activeTileLayer = googleHybridLayer;
    if (btnHybrid) btnHybrid.className = activeClass;
  } else if (layerType === 'google-roads') {
    activeTileLayer = googleRoadsLayer;
    if (btnRoads) btnRoads.className = activeClass;
  } else if (layerType === 'osm') {
    activeTileLayer = osmLayer;
    if (btnOsm) btnOsm.className = activeClass;
  } else if (layerType === 'esri') {
    activeTileLayer = esriSatelliteLayer;
    if (btnEsri) btnEsri.className = activeClass;
  }

  map.addLayer(activeTileLayer);
  setTimeout(() => { if (map) map.invalidateSize(); }, 100);
};

/**
 * Load and normalize election data
 */
async function loadData() {
  try {
    let raw = [];
    if (window.ELECTION_DATA && Array.isArray(window.ELECTION_DATA)) {
      raw = window.ELECTION_DATA;
    } else {
      const res = await fetch('data.json');
      raw = await res.json();
    }

    state.data = raw.map((item, index) => {
      // Normalize sensitivity
      let sens = (item.sensitivity || '').toUpperCase().trim();
      if (sens.includes('HYPER') || sens.includes('SENSITVIE') && sens.includes('HYPER')) {
        sens = 'HYPER SENSITIVE';
      } else if (sens.includes('SENSITIVE')) {
        sens = 'SENSITIVE';
      } else {
        sens = 'NORMAL';
      }

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      return {
        ...item,
        sno: item.id || (index + 1).toString(),
        sensitivity: sens,
        voters: parseInt(item.voters) || 0,
        lat: hasValidCoords ? lat : null,
        lng: hasValidCoords ? lng : null,
        hasCoords: hasValidCoords
      };
    });

    state.filteredData = [...state.data];
    updateHeaderStats();
  } catch (err) {
    console.error('Failed to load election data:', err);
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = tab.getAttribute('data-target');
      switchTab(target);
    });
  });

  // Filter controls
  document.getElementById('filter-search').addEventListener('input', (e) => {
    state.filters.search = e.target.value.trim().toLowerCase();
    const clearBtn = document.getElementById('btn-clear-search');
    if (state.filters.search) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('btn-clear-search').addEventListener('click', () => {
    document.getElementById('filter-search').value = '';
    state.filters.search = '';
    document.getElementById('btn-clear-search').classList.add('hidden');
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('filter-mandal').addEventListener('change', (e) => {
    state.filters.mandal = e.target.value;
    updateMptcAndRouteDropdowns();
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('filter-mptc').addEventListener('change', (e) => {
    state.filters.mptc = e.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('filter-sensitivity').addEventListener('change', (e) => {
    state.filters.sensitivity = e.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('filter-route').addEventListener('change', (e) => {
    state.filters.route = e.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    resetFilters();
  });

  // API Settings Modal
  const apiModal = document.getElementById('modal-api-settings');
  const btnOpenApiModal = document.getElementById('btn-open-api-modal');
  const btnCloseApiModal = document.getElementById('btn-close-api-modal');
  const btnSaveCustomTile = document.getElementById('btn-save-custom-tile');
  const inputCustomTile = document.getElementById('input-custom-tile-url');
  const customStatus = document.getElementById('custom-tile-status');

  if (btnOpenApiModal && apiModal) {
    btnOpenApiModal.addEventListener('click', () => {
      apiModal.classList.remove('hidden');
      if (inputCustomTile) {
        inputCustomTile.value = localStorage.getItem('custom_map_tile_url') || '';
      }
    });
  }

  if (btnCloseApiModal && apiModal) {
    btnCloseApiModal.addEventListener('click', () => {
      apiModal.classList.add('hidden');
    });
  }

  if (btnSaveCustomTile && inputCustomTile) {
    btnSaveCustomTile.addEventListener('click', () => {
      const url = inputCustomTile.value.trim();
      if (url) {
        localStorage.setItem('custom_map_tile_url', url);
        if (customStatus) {
          customStatus.classList.remove('hidden');
          setTimeout(() => customStatus.classList.add('hidden'), 3000);
        }
        // Apply immediately
        if (map && activeTileLayer) {
          map.removeLayer(activeTileLayer);
          activeTileLayer = L.tileLayer(url, { maxZoom: 20 });
          map.addLayer(activeTileLayer);
        }
      } else {
        localStorage.removeItem('custom_map_tile_url');
        switchMapLayer('google-hybrid');
      }
    });
  }

  // Clustering Toggle
  document.getElementById('toggle-cluster').addEventListener('change', (e) => {
    renderMapMarkers();
  });

  // Route Line Toggle
  document.getElementById('toggle-route-line').addEventListener('change', (e) => {
    renderRoutePolyline();
  });

  // Live Location button
  document.getElementById('btn-live-location').addEventListener('click', () => {
    locateUser();
  });

  // Language Switcher
  document.getElementById('btn-toggle-lang').addEventListener('click', () => {
    toggleLanguage();
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    exportToCSV();
  });

  // Directory View toggle (Cards vs Table)
  document.getElementById('btn-view-cards').addEventListener('click', () => {
    state.viewMode = 'cards';
    document.getElementById('stations-card-container').classList.remove('hidden');
    document.getElementById('stations-table-container').classList.add('hidden');
    document.getElementById('btn-view-cards').className = 'px-2.5 py-1 rounded bg-blue-600 text-white font-medium';
    document.getElementById('btn-view-table').className = 'px-2.5 py-1 rounded text-slate-300 hover:text-white font-medium';
    renderStationsDirectory();
  });

  document.getElementById('btn-view-table').addEventListener('click', () => {
    state.viewMode = 'table';
    document.getElementById('stations-card-container').classList.add('hidden');
    document.getElementById('stations-table-container').classList.remove('hidden');
    document.getElementById('btn-view-table').className = 'px-2.5 py-1 rounded bg-blue-600 text-white font-medium';
    document.getElementById('btn-view-cards').className = 'px-2.5 py-1 rounded text-slate-300 hover:text-white font-medium';
    renderStationsDirectory();
  });

  // Sort stations
  document.getElementById('sort-stations').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.currentPage = 1;
    sortFilteredData();
    renderStationsDirectory();
  });

  // Close Drawer
  document.getElementById('btn-close-drawer').addEventListener('click', () => {
    closeDrawer();
  });

  // Directory search
  document.getElementById('directory-search').addEventListener('input', (e) => {
    renderEmergencyDirectory(e.target.value.toLowerCase().trim());
  });
}

/**
 * Switch Navigation Tab
 */
function switchTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.getAttribute('data-target') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.remove('hidden');
    } else {
      pane.classList.add('hidden');
    }
  });

  if (tabId === 'tab-map') {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  } else if (tabId === 'tab-stations') {
    renderStationsDirectory();
  } else if (tabId === 'tab-routes') {
    renderRoutesView();
  } else if (tabId === 'tab-analytics') {
    renderAnalyticsDashboard();
  } else if (tabId === 'tab-directory') {
    renderEmergencyDirectory();
  }
}

/**
 * Populate Dropdowns
 */
function populateDropdowns() {
  const mandalSelect = document.getElementById('filter-mandal');
  const mandals = [...new Set(state.data.map(d => d.mandal).filter(Boolean))].sort();

  mandalSelect.innerHTML = `<option value="">${i18n[state.lang].allMandals}</option>`;
  mandals.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    mandalSelect.appendChild(opt);
  });

  updateMptcAndRouteDropdowns();
}

/**
 * Update MPTC & Route Dropdowns based on selected Mandal
 */
function updateMptcAndRouteDropdowns() {
  const mptcSelect = document.getElementById('filter-mptc');
  const routeSelect = document.getElementById('filter-route');

  const filteredScope = state.filters.mandal 
    ? state.data.filter(d => d.mandal === state.filters.mandal) 
    : state.data;

  const mptcs = [...new Set(filteredScope.map(d => d.mptc).filter(Boolean))].sort();
  mptcSelect.innerHTML = `<option value="">${i18n[state.lang].allMptc}</option>`;
  mptcs.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    mptcSelect.appendChild(opt);
  });

  const routes = [...new Set(filteredScope.map(d => d.route).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  routeSelect.innerHTML = `<option value="">${i18n[state.lang].allRoutes}</option>`;
  routes.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = `Route ${r}`;
    routeSelect.appendChild(opt);
  });
}

/**
 * Reset all filters
 */
function resetFilters() {
  state.filters = {
    search: '',
    mandal: '',
    mptc: '',
    sensitivity: '',
    route: '',
    police: ''
  };
  document.getElementById('filter-search').value = '';
  document.getElementById('btn-clear-search').classList.add('hidden');
  document.getElementById('filter-mandal').value = '';
  document.getElementById('filter-sensitivity').value = '';
  updateMptcAndRouteDropdowns();
  state.currentPage = 1;
  applyFilters();
}

/**
 * Apply Filters across dataset
 */
function applyFilters() {
  const { search, mandal, mptc, sensitivity, route } = state.filters;

  state.filteredData = state.data.filter(item => {
    if (mandal && item.mandal !== mandal) return false;
    if (mptc && item.mptc !== mptc) return false;
    if (sensitivity && item.sensitivity !== sensitivity) return false;
    if (route && item.route !== route) return false;

    if (search) {
      const match = 
        (item.pslName && item.pslName.toLowerCase().includes(search)) ||
        (item.pslDetails && item.pslDetails.toLowerCase().includes(search)) ||
        (item.mandal && item.mandal.toLowerCase().includes(search)) ||
        (item.mptc && item.mptc.toLowerCase().includes(search)) ||
        (item.code && item.code.toLowerCase().includes(search)) ||
        (item.blo && item.blo.toLowerCase().includes(search)) ||
        (item.incharge && item.incharge.toLowerCase().includes(search)) ||
        (item.route && item.route.toLowerCase().includes(search));
      if (!match) return false;
    }

    return true;
  });

  sortFilteredData();

  // Update filtered counts
  document.getElementById('badge-filtered-count').textContent = state.filteredData.length;
  document.getElementById('directory-count-text').textContent = `${state.filteredData.length} ${state.lang === 'te' ? 'పోలింగ్ కేంద్రాలు కనుగొనబడ్డాయి' : 'polling stations matched'}`;

  // Update active views
  renderMapMarkers();
  renderRoutePolyline();

  if (state.currentTab === 'tab-stations') {
    renderStationsDirectory();
  } else if (state.currentTab === 'tab-routes') {
    renderRoutesView();
  } else if (state.currentTab === 'tab-analytics') {
    renderAnalyticsDashboard();
  }
}

/**
 * Sort filtered data
 */
function sortFilteredData() {
  switch (state.sortBy) {
    case 'id-asc':
      state.filteredData.sort((a,b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
      break;
    case 'voters-desc':
      state.filteredData.sort((a,b) => b.voters - a.voters);
      break;
    case 'distance-asc':
      state.filteredData.sort((a,b) => (parseFloat(a.distanceKm) || 999) - (parseFloat(b.distanceKm) || 999));
      break;
    case 'name-asc':
      state.filteredData.sort((a,b) => a.pslName.localeCompare(b.pslName));
      break;
  }
}

/**
 * Update Header Statistics
 */
function updateHeaderStats() {
  const totalPS = state.data.length;
  const totalVoters = state.data.reduce((acc, cur) => acc + cur.voters, 0);
  const hyperPS = state.data.filter(d => d.sensitivity === 'HYPER SENSITIVE').length;

  document.getElementById('stat-total-ps').textContent = totalPS.toLocaleString('en-IN');
  document.getElementById('stat-total-voters').textContent = (totalVoters / 1000000).toFixed(2) + 'M';
  document.getElementById('stat-hyper-ps').textContent = hyperPS.toLocaleString('en-IN');

  document.getElementById('metric-stations').textContent = totalPS.toLocaleString('en-IN');
  document.getElementById('metric-voters').textContent = totalVoters.toLocaleString('en-IN');
  document.getElementById('metric-hyper').textContent = hyperPS.toLocaleString('en-IN');
}

/**
 * Create Custom Marker Icon based on Sensitivity
 */
function createCustomPin(sensitivity, label) {
  let pinClass = 'pin-normal';
  let iconHtml = '<i class="fa-solid fa-check"></i>';

  if (sensitivity === 'HYPER SENSITIVE') {
    pinClass = 'pin-hyper';
    iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';
  } else if (sensitivity === 'SENSITIVE') {
    pinClass = 'pin-sensitive';
    iconHtml = '<i class="fa-solid fa-shield"></i>';
  }

  return L.divIcon({
    className: 'custom-pin-wrapper',
    html: `
      <div class="custom-pin ${pinClass}">
        <div class="custom-pin-inner">${iconHtml}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

/**
 * Render Leaflet Map Markers
 */
function renderMapMarkers() {
  markerClusterGroup.clearLayers();

  const useClustering = document.getElementById('toggle-cluster').checked;
  const validStations = state.filteredData.filter(d => d.hasCoords);

  const markerList = [];

  validStations.forEach(item => {
    const icon = createCustomPin(item.sensitivity);
    const marker = L.marker([item.lat, item.lng], { icon: icon });

    marker.bindPopup(buildMarkerPopupHtml(item), { maxWidth: 320 });
    marker.on('click', () => {
      openStationDetails(item);
    });

    markerList.push(marker);
  });

  if (useClustering) {
    markerClusterGroup.addLayers(markerList);
  } else {
    // Direct markers
    markerList.forEach(m => markerClusterGroup.addLayer(m));
  }

  // Fit bounds if markers exist and not zoomed in on one
  if (validStations.length > 0 && !state.selectedStation) {
    const group = L.featureGroup(markerList);
    map.fitBounds(group.getBounds().pad(0.08));
  }
}

/**
 * Build Marker Popup HTML
 */
function buildMarkerPopupHtml(item) {
  const badgeClass = item.sensitivity === 'HYPER SENSITIVE' ? 'badge-hyper' : (item.sensitivity === 'SENSITIVE' ? 'badge-sensitive' : 'badge-normal');
  const bloPhone = item.blo ? item.blo.replace(/\D/g, '') : '';

  return `
    <div class="p-3 text-xs">
      <div class="flex items-center justify-between mb-1.5">
        <span class="px-2 py-0.5 rounded-full font-bold text-[10px] ${badgeClass}">${item.sensitivity}</span>
        <span class="text-slate-400 font-mono text-[11px]">S.No: ${item.sno}</span>
      </div>
      <h4 class="font-bold text-white text-sm leading-snug">${escapeHtml(item.pslName.split('\n')[0])}</h4>
      <p class="text-slate-400 text-[11px] mt-0.5">${escapeHtml(item.mandal)} | MPTC: ${escapeHtml(item.mptc)}</p>
      
      <div class="mt-2.5 grid grid-cols-2 gap-1.5 py-1.5 border-t border-b border-slate-700/60 text-[11px]">
        <div><span class="text-slate-400">రూట్:</span> <span class="font-bold text-amber-400">Route ${item.route}</span></div>
        <div><span class="text-slate-400">ఓటర్లు:</span> <span class="font-bold text-white">${item.voters}</span></div>
        <div><span class="text-slate-400">దూరం:</span> <span class="font-semibold text-blue-400">${item.distanceKm || '-'} KM</span></div>
        <div><span class="text-slate-400">ఫోర్స్:</span> <span class="font-semibold text-indigo-300">PC:${item.pc||0} HG:${item.hg||0}</span></div>
      </div>

      <div class="mt-3 flex space-x-1.5">
        <button onclick="openStationDetailsById('${item.id}')" class="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-center font-semibold">
          పూర్తి వివరాలు
        </button>
        ${bloPhone ? `
          <a href="tel:${bloPhone}" class="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-phone"></i>
          </a>
        ` : ''}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center" title="Google Maps Navigation">
          <i class="fa-solid fa-diamond-turn-right text-amber-400"></i>
        </a>
      </div>
    </div>
  `;
}

/**
 * Render Route Polyline connecting stations sequentially
 */
function renderRoutePolyline() {
  if (state.activeRoutePolyline) {
    map.removeLayer(state.activeRoutePolyline);
    state.activeRoutePolyline = null;
  }
  state.activeRouteMarkers.forEach(m => map.removeLayer(m));
  state.activeRouteMarkers = [];

  const shouldConnect = document.getElementById('toggle-route-line').checked;
  if (!shouldConnect) return;

  // If a specific route is chosen (and optionally mandal)
  if (state.filters.route) {
    const routeStations = state.filteredData
      .filter(d => d.hasCoords)
      .sort((a,b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));

    if (routeStations.length > 1) {
      const latlngs = routeStations.map(s => [s.lat, s.lng]);

      // Glowing route line
      state.activeRoutePolyline = L.polyline(latlngs, {
        color: '#38bdf8',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 8',
        lineJoin: 'round'
      }).addTo(map);

      // Add numbered stop badges
      routeStations.forEach((s, idx) => {
        const stopIcon = L.divIcon({
          className: 'stop-pin-wrapper',
          html: `
            <div style="background:#0284c7; color:#fff; font-size:10px; font-weight:800; border:2px solid #fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.4);">
              ${idx + 1}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const m = L.marker([s.lat, s.lng], { icon: stopIcon, zIndexOffset: 500 }).addTo(map);
        m.bindTooltip(`Stop ${idx + 1}: ${escapeHtml(s.pslName.split('\n')[0])}`, { direction: 'top' });
        state.activeRouteMarkers.push(m);
      });

      map.fitBounds(state.activeRoutePolyline.getBounds().pad(0.15));
    }
  }
}

/**
 * Open Slide-over Drawer with Polling Station Details
 */
window.openStationDetailsById = function(id) {
  const item = state.data.find(d => d.id === id);
  if (item) {
    openStationDetails(item);
  }
};

function openStationDetails(item) {
  state.selectedStation = item;

  // Update Drawer Elements
  const drawer = document.getElementById('station-drawer');
  const badge = document.getElementById('drawer-sensitivity-badge');
  badge.textContent = item.sensitivity;
  badge.className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${
    item.sensitivity === 'HYPER SENSITIVE' ? 'badge-hyper' : (item.sensitivity === 'SENSITIVE' ? 'badge-sensitive' : 'badge-normal')
  }`;

  document.getElementById('drawer-code').textContent = `PS Code: ${item.code || '-'}`;
  document.getElementById('drawer-psl-name').textContent = item.pslName;
  document.getElementById('drawer-psl-details').textContent = item.pslDetails || '';
  document.getElementById('drawer-mandal').textContent = item.mandal;
  document.getElementById('drawer-mptc').textContent = item.mptc;
  document.getElementById('drawer-route').textContent = `Route ${item.route}`;
  document.getElementById('drawer-police').textContent = item.psPolice || '-';
  document.getElementById('drawer-distance').textContent = `${item.distanceKm || '-'} KMs`;
  document.getElementById('drawer-voters').textContent = item.voters.toLocaleString('en-IN');

  const forces = [];
  if (item.si) forces.push(`SI: ${item.si}`);
  if (item.asi) forces.push(`ASI/HC: ${item.asi}`);
  if (item.pc) forces.push(`PC: ${item.pc}`);
  if (item.hg) forces.push(`HG: ${item.hg}`);
  document.getElementById('drawer-forces').textContent = forces.length ? forces.join(', ') : 'PC: 1, HG: 1';

  // BLO Phone
  const bloPhone = item.blo ? item.blo.replace(/\D/g, '') : '';
  document.getElementById('drawer-blo-phone').textContent = item.blo || 'అందుబాటులో లేదు';
  const bloCallBtn = document.getElementById('drawer-blo-call');
  if (bloPhone) {
    bloCallBtn.href = `tel:${bloPhone}`;
    bloCallBtn.classList.remove('opacity-50', 'pointer-events-none');
  } else {
    bloCallBtn.classList.add('opacity-50', 'pointer-events-none');
  }

  // Police Incharge text & dynamic buttons
  const inchargeText = item.incharge || 'SI KV Sures, 6309990846\nCI, Ramakrishna , 6309990814';
  document.getElementById('drawer-incharge-text').textContent = inchargeText;

  // Extract phone numbers
  const phoneMatches = inchargeText.match(/\d{10}/g) || [];
  const actionsDiv = document.getElementById('drawer-incharge-actions');
  actionsDiv.innerHTML = '';
  phoneMatches.forEach((ph, i) => {
    const officerLabel = i === 0 ? 'SI Call' : 'CI Call';
    const a = document.createElement('a');
    a.href = `tel:${ph}`;
    a.className = 'flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-center flex items-center justify-center space-x-1 text-xs shadow transition';
    a.innerHTML = `<i class="fa-solid fa-phone"></i><span>${officerLabel}</span>`;
    actionsDiv.appendChild(a);

    const wa = document.createElement('a');
    wa.href = `https://wa.me/91${ph}`;
    wa.target = '_blank';
    wa.className = 'py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center text-xs';
    wa.innerHTML = `<i class="fa-brands fa-whatsapp"></i>`;
    actionsDiv.appendChild(wa);
  });

  // Google Maps link
  const gmapsLink = document.getElementById('drawer-gmaps-link');
  if (item.hasCoords) {
    gmapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    gmapsLink.classList.remove('opacity-50', 'pointer-events-none');
  } else {
    gmapsLink.classList.add('opacity-50', 'pointer-events-none');
  }

  // Distance from Live Location button
  const distanceBtn = document.getElementById('drawer-live-distance-btn');
  const distanceText = document.getElementById('drawer-live-distance-text');
  distanceBtn.onclick = () => {
    if (!state.userLocation) {
      locateUser((pos) => {
        calculateDistanceToStation(item, pos);
      });
    } else {
      calculateDistanceToStation(item, state.userLocation);
    }
  };

  // Open Drawer
  drawer.classList.remove('translate-x-full');

  // Pan map to station
  if (item.hasCoords) {
    map.setView([item.lat, item.lng], 15, { animate: true });
  }
}

function calculateDistanceToStation(item, userPos) {
  if (!item.hasCoords) {
    alert('ఈ కేంద్రానికి జీపీఎస్ కోఆర్డినేట్స్ లేవు.');
    return;
  }
  const dist = getHaversineDistance(userPos.lat, userPos.lng, item.lat, item.lng);
  document.getElementById('drawer-live-distance-text').innerHTML = `మీ లొకేషన్ నుండి దూరం: <strong class="text-amber-300 font-bold">${dist.toFixed(2)} KM</strong>`;
}

function closeDrawer() {
  document.getElementById('station-drawer').classList.add('translate-x-full');
  state.selectedStation = null;
}

/**
 * Locate User via HTML5 Geolocation API
 */
function locateUser(callback) {
  if (!navigator.geolocation) {
    alert('మీ బ్రౌజర్ లేదా పరికరంలో జియోలొకేషన్ సపోర్ట్ లేదు.');
    return;
  }

  const btn = document.getElementById('btn-live-location');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>ట్రాకింగ్...</span>`;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      btn.innerHTML = originalHtml;
      const { latitude, longitude, accuracy } = position.coords;
      state.userLocation = { lat: latitude, lng: longitude };

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      const userIcon = L.divIcon({
        className: 'user-beacon-wrapper',
        html: `<div class="user-beacon"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarker.bindPopup(`
        <div class="p-2 text-xs">
          <strong class="text-blue-400"><i class="fa-solid fa-street-view"></i> మీ ప్రస్తుత లొకేషన్</strong>
          <div class="text-[11px] text-slate-300 mt-1">Accuracy: ~${Math.round(accuracy)}m</div>
        </div>
      `).openPopup();

      map.setView([latitude, longitude], 14, { animate: true });

      if (callback) callback({ lat: latitude, lng: longitude });
    },
    (err) => {
      btn.innerHTML = originalHtml;
      console.warn('Geolocation error:', err.message);
      alert('లొకేషన్ యాక్సెస్ తిరస్కరించబడింది లేదా లభించలేదు. దయచేసి GPS ఆన్ చేయండి.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/**
 * Haversine formula for distance calculation in KM
 */
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Render Stations Directory (Cards / Table)
 */
function renderStationsDirectory() {
  const total = state.filteredData.length;
  const startIdx = (state.currentPage - 1) * state.pageSize;
  const endIdx = Math.min(startIdx + state.pageSize, total);
  const pageItems = state.filteredData.slice(startIdx, endIdx);

  // Pagination Info
  document.getElementById('pagination-info').textContent = 
    `Showing ${total > 0 ? startIdx + 1 : 0} to ${endIdx} of ${total.toLocaleString('en-IN')} stations`;

  // Render Pagination Buttons
  renderPaginationButtons(Math.ceil(total / state.pageSize));

  if (state.viewMode === 'cards') {
    const container = document.getElementById('stations-card-container');
    if (pageItems.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-500">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
          <p>ఎలాంటి పోలింగ్ కేంద్రాలు కనుగొనబడలేదు.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pageItems.map(item => {
      const badgeClass = item.sensitivity === 'HYPER SENSITIVE' ? 'badge-hyper' : (item.sensitivity === 'SENSITIVE' ? 'badge-sensitive' : 'badge-normal');
      const bloPhone = item.blo ? item.blo.replace(/\D/g, '') : '';

      return `
        <div class="glass-card rounded-2xl p-4 flex flex-col justify-between border border-slate-800">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${item.sensitivity}</span>
              <span class="text-xs font-mono text-slate-400">S.No #${item.sno}</span>
            </div>

            <h3 class="font-bold text-white text-sm leading-snug line-clamp-2" title="${escapeHtml(item.pslName)}">
              ${escapeHtml(item.pslName)}
            </h3>

            <div class="mt-3 space-y-1 text-xs text-slate-300">
              <div class="flex justify-between">
                <span class="text-slate-400">మండలం:</span>
                <span class="font-medium text-white">${escapeHtml(item.mandal)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">MPTC:</span>
                <span class="text-slate-200">${escapeHtml(item.mptc)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">రూట్:</span>
                <span class="font-bold text-amber-400">Route ${item.route}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">పోలీస్ స్టేషన్:</span>
                <span class="text-slate-200">${escapeHtml(item.psPolice || '-')} (${item.distanceKm || '-'} KM)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">ఓటర్లు:</span>
                <span class="font-bold text-blue-400">${item.voters.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
            <button onclick="openStationDetailsById('${item.id}')" class="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center space-x-1 shadow transition">
              <i class="fa-solid fa-eye"></i>
              <span>వివరాలు</span>
            </button>

            ${bloPhone ? `
              <a href="tel:${bloPhone}" class="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center font-medium" title="Call BLO: ${item.blo}">
                <i class="fa-solid fa-phone"></i>
              </a>
            ` : ''}

            ${item.hasCoords ? `
              <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg flex items-center justify-center" title="Google Maps Directions">
                <i class="fa-solid fa-diamond-turn-right"></i>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Table View
    const tbody = document.getElementById('stations-table-body');
    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-500">ఎలాంటి పోలింగ్ కేంద్రాలు కనుగొనబడలేదు.</td></tr>`;
      return;
    }

    tbody.innerHTML = pageItems.map(item => {
      const badgeClass = item.sensitivity === 'HYPER SENSITIVE' ? 'badge-hyper' : (item.sensitivity === 'SENSITIVE' ? 'badge-sensitive' : 'badge-normal');
      const bloPhone = item.blo ? item.blo.replace(/\D/g, '') : '';

      return `
        <tr class="hover:bg-slate-800/40 transition">
          <td class="p-3 font-mono text-slate-400">${item.sno}</td>
          <td class="p-3">
            <div class="font-bold text-white max-w-xs truncate" title="${escapeHtml(item.pslName)}">${escapeHtml(item.pslName.split('\n')[0])}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(item.pslDetails ? item.pslDetails.split('\n')[0] : '')}</div>
          </td>
          <td class="p-3">
            <div class="text-white">${escapeHtml(item.mandal)}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(item.mptc)}</div>
          </td>
          <td class="p-3 font-bold text-amber-400">R-${item.route}</td>
          <td class="p-3 font-semibold text-blue-400">${item.voters}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${item.sensitivity}</span></td>
          <td class="p-3 font-mono">
            ${bloPhone ? `<a href="tel:${bloPhone}" class="text-emerald-400 hover:underline"><i class="fa-solid fa-phone text-[10px] mr-1"></i>${item.blo}</a>` : '-'}
          </td>
          <td class="p-3 text-[11px] text-slate-300">PC:${item.pc||0}, HG:${item.hg||0}</td>
          <td class="p-3 text-right">
            <button onclick="openStationDetailsById('${item.id}')" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold mr-1">
              చూడు
            </button>
            ${item.hasCoords ? `
              <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" class="px-2 py-1 bg-slate-800 text-amber-400 rounded text-xs border border-slate-700">
                <i class="fa-solid fa-location-arrow"></i>
              </a>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Render Pagination Buttons
 */
function renderPaginationButtons(totalPages) {
  const container = document.getElementById('pagination-buttons');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  // Prev
  html += `
    <button onclick="changePage(${state.currentPage - 1})" ${state.currentPage === 1 ? 'disabled class="px-2.5 py-1 rounded bg-slate-900 text-slate-600 cursor-not-allowed"' : 'class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"'}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  const start = Math.max(1, state.currentPage - 2);
  const end = Math.min(totalPages, state.currentPage + 2);

  for (let p = start; p <= end; p++) {
    html += `
      <button onclick="changePage(${p})" class="px-2.5 py-1 rounded font-medium ${p === state.currentPage ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}">
        ${p}
      </button>
    `;
  }

  // Next
  html += `
    <button onclick="changePage(${state.currentPage + 1})" ${state.currentPage === totalPages ? 'disabled class="px-2.5 py-1 rounded bg-slate-900 text-slate-600 cursor-not-allowed"' : 'class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"'}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

window.changePage = function(page) {
  state.currentPage = page;
  renderStationsDirectory();
};

/**
 * Render Route Planner View
 */
function renderRoutesView() {
  const container = document.getElementById('routes-container');

  // Group filtered data by Mandal and Route
  const routeGroups = {};
  state.filteredData.forEach(item => {
    const key = `${item.mandal}__${item.route}`;
    if (!routeGroups[key]) {
      routeGroups[key] = {
        mandal: item.mandal,
        route: item.route,
        stations: []
      };
    }
    routeGroups[key].stations.push(item);
  });

  const groupKeys = Object.keys(routeGroups).sort();
  document.getElementById('total-routes-count').textContent = groupKeys.length;

  if (groupKeys.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <i class="fa-solid fa-route text-3xl mb-2"></i>
        <p>ఎలాంటి రూట్ ప్రణాళికలు లభించలేదు.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = groupKeys.map(k => {
    const group = routeGroups[k];
    const stations = group.stations.sort((a,b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
    const totalVoters = stations.reduce((acc, cur) => acc + cur.voters, 0);
    const hyperCount = stations.filter(s => s.sensitivity === 'HYPER SENSITIVE').length;
    const sensitiveCount = stations.filter(s => s.sensitivity === 'SENSITIVE').length;

    return `
      <div class="glass-card rounded-2xl p-5 border border-slate-800">
        <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/40">
                రూట్ నంబర్: ${group.route}
              </span>
              <h3 class="text-base font-bold text-white">${escapeHtml(group.mandal)} మండలం</h3>
            </div>
            <div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
              <span><i class="fa-solid fa-person-booth text-blue-400 mr-1"></i> కేంద్రాలు: <strong class="text-white">${stations.length}</strong></span>
              <span><i class="fa-solid fa-users text-emerald-400 mr-1"></i> ఓటర్లు: <strong class="text-white">${totalVoters.toLocaleString('en-IN')}</strong></span>
              ${hyperCount > 0 ? `<span class="text-red-400 font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>హైపర్: ${hyperCount}</span>` : ''}
              ${sensitiveCount > 0 ? `<span class="text-amber-400 font-semibold"><i class="fa-solid fa-shield mr-1"></i>సెన్సిటివ్: ${sensitiveCount}</span>` : ''}
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="focusRouteOnMap('${escapeHtml(group.mandal)}', '${escapeHtml(group.route)}')" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow transition">
              <i class="fa-solid fa-map-location-dot"></i>
              <span>మ్యాప్‌లో రూట్ చూడు</span>
            </button>
          </div>
        </div>

        <!-- Ordered Polling Stations Sequence along the route -->
        <div class="mt-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">రూట్ వరుస క్రమం (Sequence of Stations):</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${stations.map((s, idx) => {
              const badgeClass = s.sensitivity === 'HYPER SENSITIVE' ? 'border-red-500/50 bg-red-950/20 text-red-300' : (s.sensitivity === 'SENSITIVE' ? 'border-amber-500/50 bg-amber-950/20 text-amber-300' : 'border-slate-700 bg-slate-900/40 text-slate-200');
              return `
                <div onclick="openStationDetailsById('${s.id}')" class="p-2.5 rounded-xl border ${badgeClass} hover:border-blue-500 cursor-pointer transition flex items-start space-x-2">
                  <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                    ${idx + 1}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-white truncate" title="${escapeHtml(s.pslName)}">${escapeHtml(s.pslName.split('\n')[0])}</div>
                    <div class="text-[10px] text-slate-400">MPTC: ${escapeHtml(s.mptc)} | ${s.voters} ఓటర్లు</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.focusRouteOnMap = function(mandal, route) {
  state.filters.mandal = mandal;
  document.getElementById('filter-mandal').value = mandal;
  updateMptcAndRouteDropdowns();
  state.filters.route = route;
  document.getElementById('filter-route').value = route;
  applyFilters();
  switchTab('tab-map');
};

/**
 * Render Analytics Dashboard Charts
 */
function renderAnalyticsDashboard() {
  const ctxSens = document.getElementById('chart-sensitivity');
  const ctxForces = document.getElementById('chart-forces');
  const ctxMandals = document.getElementById('chart-mandals');

  if (!ctxSens || !ctxForces || !ctxMandals) return;

  // Sensitivity Breakdown
  const normalCount = state.data.filter(d => d.sensitivity === 'NORMAL').length;
  const sensitiveCount = state.data.filter(d => d.sensitivity === 'SENSITIVE').length;
  const hyperCount = state.data.filter(d => d.sensitivity === 'HYPER SENSITIVE').length;

  if (state.charts.sensitivity) state.charts.sensitivity.destroy();
  state.charts.sensitivity = new Chart(ctxSens, {
    type: 'doughnut',
    data: {
      labels: ['సాధారణ (Normal)', 'సెన్సిటివ్ (Sensitive)', 'హైపర్ సెన్సిటివ్ (Hyper Sensitive)'],
      datasets: [{
        data: [normalCount, sensitiveCount, hyperCount],
        backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });

  // Police Force by Rank
  let siTotal = 0, asiTotal = 0, pcTotal = 0, hgTotal = 0;
  state.data.forEach(d => {
    if (d.si && /\d+/.test(d.si)) siTotal += parseInt(d.si);
    if (d.asi && /\d+/.test(d.asi)) asiTotal += parseInt(d.asi);
    if (d.pc && /\d+/.test(d.pc)) pcTotal += parseInt(d.pc);
    if (d.hg && /\d+/.test(d.hg)) hgTotal += parseInt(d.hg);
  });

  if (state.charts.forces) state.charts.forces.destroy();
  state.charts.forces = new Chart(ctxForces, {
    type: 'bar',
    data: {
      labels: ['SI (సబ్-ఇన్‌స్పెక్టర్)', 'ASI / HC (హెడ్ కానిస్టేబుల్)', 'PC (పోలీస్ కానిస్టేబుల్)', 'HG (హోమ్‌గార్డ్)'],
      datasets: [{
        label: 'సిబ్బంది సంఖ్య',
        data: [siTotal, asiTotal, pcTotal, hgTotal],
        backgroundColor: ['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Top Mandals by Voter Count
  const mandalVoters = {};
  state.data.forEach(d => {
    if (d.mandal) {
      mandalVoters[d.mandal] = (mandalVoters[d.mandal] || 0) + d.voters;
    }
  });

  const sortedMandals = Object.entries(mandalVoters)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10);

  if (state.charts.mandals) state.charts.mandals.destroy();
  state.charts.mandals = new Chart(ctxMandals, {
    type: 'bar',
    data: {
      labels: sortedMandals.map(m => m[0]),
      datasets: [{
        label: 'మొత్తం ఓటర్లు',
        data: sortedMandals.map(m => m[1]),
        backgroundColor: '#f59e0b',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

/**
 * Render Emergency & Police Officers Directory
 */
function renderEmergencyDirectory(searchQuery = '') {
  const policeGrid = document.getElementById('police-officers-grid');
  const bloGrid = document.getElementById('blo-directory-grid');

  // Hardcoded key emergency helpline and officers from dataset
  const officers = [
    { rank: 'Sub-Inspector (SI)', name: 'KV Sures', phone: '6309990846', jurisdiction: 'Srikakulam Rural & General Jurisdiction' },
    { rank: 'Circle Inspector (CI)', name: 'Ramakrishna', phone: '6309990814', jurisdiction: 'Srikakulam Circle & Law & Order' },
    { rank: 'Police Control Room', name: 'District Police Control', phone: '100 / 112', jurisdiction: 'District Emergency Helpline' },
    { rank: 'Election Cell Helpline', name: 'Collectorate Control Room', phone: '1950', jurisdiction: 'Voter & Election Inquiries' }
  ];

  policeGrid.innerHTML = officers.map(o => `
    <div class="glass-card rounded-xl p-4 border border-blue-500/30 flex items-center justify-between">
      <div>
        <span class="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">${o.rank}</span>
        <h4 class="font-bold text-white text-sm mt-1">${o.name}</h4>
        <p class="text-[11px] text-slate-400">${o.jurisdiction}</p>
        <div class="font-mono text-emerald-400 font-bold text-xs mt-1"><i class="fa-solid fa-phone mr-1"></i>${o.phone}</div>
      </div>
      <div class="flex space-x-1.5">
        <a href="tel:${o.phone.replace(/\D/g,'')}" class="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow">
          <i class="fa-solid fa-phone"></i>
        </a>
        <a href="https://wa.me/91${o.phone.replace(/\D/g,'')}" target="_blank" class="p-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white">
          <i class="fa-brands fa-whatsapp"></i>
        </a>
      </div>
    </div>
  `).join('');

  // BLO Directory
  const blos = state.data
    .filter(d => d.blo && d.blo.trim() !== '')
    .filter(d => {
      if (!searchQuery) return true;
      return d.blo.toLowerCase().includes(searchQuery) || 
             d.mandal.toLowerCase().includes(searchQuery) ||
             d.pslName.toLowerCase().includes(searchQuery);
    })
    .slice(0, 48); // limit top 48 for fast responsiveness

  bloGrid.innerHTML = blos.map(b => {
    const cleanPhone = b.blo.replace(/\D/g, '');
    return `
      <div class="glass-card rounded-xl p-3 border border-slate-800 text-xs">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-bold text-white truncate max-w-[180px]" title="${escapeHtml(b.pslName)}">${escapeHtml(b.pslName.split('\n')[0])}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(b.mandal)} (S.No: ${b.sno})</div>
          </div>
          <a href="tel:${cleanPhone}" class="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow">
            <i class="fa-solid fa-phone"></i>
          </a>
        </div>
        <div class="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center font-mono">
          <span class="text-slate-400">BLO Phone:</span>
          <span class="font-bold text-emerald-400">${b.blo}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggle Language between Telugu and English
 */
function toggleLanguage() {
  state.lang = state.lang === 'te' ? 'en' : 'te';
  document.getElementById('lang-label').textContent = state.lang === 'te' ? 'తెలుగు' : 'English';

  const dict = i18n[state.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  populateDropdowns();
  applyFilters();
}

/**
 * Export Filtered Data to CSV (Compatible with Excel)
 */
function exportToCSV() {
  const headers = [
    'S.No', 'Mandal', 'MPTC', 'Route', 'PS Police', 'Code', 'PS Location Name', 
    'Details', 'Voters', 'Sensitivity', 'BLO Contact', 'Distance (KM)', 
    'SI', 'ASI/HC', 'PC', 'HG', 'Latitude', 'Longitude'
  ];

  const rows = state.filteredData.map(d => [
    d.sno,
    `"${(d.mandal || '').replace(/"/g, '""')}"`,
    `"${(d.mptc || '').replace(/"/g, '""')}"`,
    d.route,
    `"${(d.psPolice || '').replace(/"/g, '""')}"`,
    d.code,
    `"${(d.pslName || '').replace(/"/g, '""')}"`,
    `"${(d.pslDetails || '').replace(/"/g, '""')}"`,
    d.voters,
    d.sensitivity,
    `"${(d.blo || '').replace(/"/g, '""')}"`,
    d.distanceKm,
    d.si,
    d.asi,
    d.pc,
    d.hg,
    d.lat || '',
    d.lng || ''
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AP_Election_Polling_Stations_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
