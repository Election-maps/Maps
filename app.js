/**
 * Election Police Administration Dashboard
 * Replicating and enhancing https://nex-gen.in/police/elections/routes/dashboard.php?page=map
 */

// Global State
const state = {
  data: [],
  filteredMapData: [],
  filteredReportData: [],
  currentView: 'map', // 'map', 'report', 'route_wise', 'ps_all'
  reportPage: 1,
  reportPageSize: 50,
  map: null,
  psAllMap: null,
  routeLayerGroup: null,
  markerLayers: [],
  layerControl: null,
  osmLayer: null,
  googleHybrid: null
};

// Initialization on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initMainMap();
  populateFilterDropdowns();
  applyMapFilters();
  renderReportTable();
  renderRouteWiseCards();
});

/**
 * Load and normalize election dataset
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

    // Check locally saved additions/edits
    const localEdits = JSON.parse(localStorage.getItem('local_election_stations') || '{}');

    state.data = raw.map((item, idx) => {
      const id = item.id || (idx + 1).toString();
      const local = localEdits[id] || {};

      let sens = (local.sensitivity || item.sensitivity || '').toUpperCase().trim();
      if (sens.includes('HYPER') || (sens.includes('SENSITVIE') && sens.includes('HYPER'))) {
        sens = 'HYPER SENSITIVE';
      } else if (sens.includes('CRITICAL')) {
        sens = 'CRITICAL';
      } else if (sens.includes('SENSITIVE')) {
        sens = 'SENSITIVE';
      } else {
        sens = 'NORMAL';
      }

      const lat = parseFloat(local.lat !== undefined ? local.lat : item.lat);
      const lng = parseFloat(local.lng !== undefined ? local.lng : item.lng);
      const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

      return {
        id: id,
        sno: item.sno || (idx + 1).toString(),
        mandal: local.mandal || item.mandal || '',
        mptc: local.mptc || item.mptc || '',
        route: local.route || item.route || '',
        routeIncharge: item.routeIncharge || '',
        strikingForce: local.strikingForce || item.strikingForce || '',
        psPolice: local.psPolice || item.psPolice || item.psName || '',
        code: item.code || '',
        pslName: local.pslName || item.pslName || '',
        pslDetails: local.pslDetails || item.pslDetails || '',
        voters: parseInt(local.voters !== undefined ? local.voters : item.voters) || 0,
        blo: local.blo || item.blo || '',
        distanceKm: local.distanceKm || item.distanceKm || '',
        sensitivity: sens,
        si: local.si !== undefined ? local.si : (item.si || ''),
        asi: local.asi !== undefined ? local.asi : (item.asi || ''),
        pc: item.pc || '',
        hg: item.hg || '',
        others: item.others || '',
        lat: hasCoords ? lat : null,
        lng: hasCoords ? lng : null,
        hasCoords: hasCoords,
        incharge: item.incharge || 'SI KV Sures, 6309990846\nCI, Ramakrishna , 6309990814'
      };
    });

    state.filteredMapData = [...state.data];
    state.filteredReportData = [...state.data];
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

/**
 * Initialize Main Election Route Map
 */
function initMainMap() {
  state.map = L.map('map').setView([18.35, 84.0], 11);

  state.osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);

  state.googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps'
  });

  const baseMaps = {
    "OpenStreetMap": state.osmLayer,
    "Google Hybrid": state.googleHybrid
  };

  state.routeLayerGroup = L.layerGroup().addTo(state.map);
  const overlayMaps = {
    "Road Route Tracking Lines": state.routeLayerGroup
  };

  state.layerControl = L.control.layers(baseMaps, overlayMaps).addTo(state.map);

  // Invalidate map size
  setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 200);
}

/**
 * Switch page view
 */
window.switchView = function(viewName) {
  state.currentView = viewName;

  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('#nav-buttons-container button').forEach(b => {
    b.className = 'px-2.5 py-1 rounded text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition flex items-center space-x-1';
  });

  if (viewName === 'map') {
    document.getElementById('view-map').classList.remove('hidden');
    document.getElementById('nav-btn-map').className = 'px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 text-white shadow transition flex items-center space-x-1';
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 150);
  } else if (viewName === 'report') {
    document.getElementById('view-report').classList.remove('hidden');
    document.getElementById('nav-btn-report').className = 'px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 text-white shadow transition flex items-center space-x-1';
    renderReportTable();
  } else if (viewName === 'route_wise') {
    document.getElementById('view-route-wise').classList.remove('hidden');
    document.getElementById('nav-btn-route-wise').className = 'px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 text-white shadow transition flex items-center space-x-1';
    renderRouteWiseCards();
  } else if (viewName === 'ps_all') {
    document.getElementById('view-ps-all').classList.remove('hidden');
    document.getElementById('nav-btn-ps-all').className = 'px-2.5 py-1 rounded text-[11px] font-medium bg-blue-600 text-white shadow transition flex items-center space-x-1';
    initPsAllMap();
  }
};

/**
 * Populate Top-Right Floating Filter Dropdowns
 */
function populateFilterDropdowns() {
  const psSelect = document.getElementById('map_psname');
  const locSelect = document.getElementById('map_location');
  const mandalReportSelect = document.getElementById('report_mandal_filter');
  const routeWisePsSelect = document.getElementById('route_wise_ps_filter');

  // Unique Police Stations (PS Names)
  const psNames = [...new Set(state.data.map(d => d.psPolice).filter(Boolean))].sort();
  psSelect.innerHTML = '<option value="">-- All PS Names --</option>';
  routeWisePsSelect.innerHTML = '<option value="">-- All Police Stations --</option>';
  psNames.forEach(ps => {
    psSelect.innerHTML += `<option value="${escapeHtml(ps)}">${escapeHtml(ps)}</option>`;
    routeWisePsSelect.innerHTML += `<option value="${escapeHtml(ps)}">${escapeHtml(ps)}</option>`;
  });

  // Unique Mandals for Report filter
  const mandals = [...new Set(state.data.map(d => d.mandal).filter(Boolean))].sort();
  mandalReportSelect.innerHTML = '<option value="">-- All Mandals --</option>';
  mandals.forEach(m => {
    mandalReportSelect.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
  });

  // Locations dropdown
  updateLocationDropdown('');
}

/**
 * Handle PS Name dropdown change
 */
window.onPSNameChange = function(psname) {
  const routeSelect = document.getElementById('map_route_no');
  routeSelect.innerHTML = '<option value="">-- All Routes --</option>';

  const filtered = psname ? state.data.filter(d => d.psPolice === psname) : state.data;
  const routes = [...new Set(filtered.map(d => d.route).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

  routes.forEach(r => {
    routeSelect.innerHTML += `<option value="${r}">Route - ${r}</option>`;
  });

  updateLocationDropdown(psname);
};

function updateLocationDropdown(psname) {
  const locSelect = document.getElementById('map_location');
  locSelect.innerHTML = '<option value="">-- All Locations --</option>';

  const filtered = psname ? state.data.filter(d => d.psPolice === psname) : state.data;
  const locations = [...new Set(filtered.map(d => d.pslName.split('\n')[0].trim()).filter(Boolean))].sort();

  locations.slice(0, 150).forEach(loc => {
    locSelect.innerHTML += `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`;
  });
}

/**
 * Apply Filters on Election Route Map
 */
window.applyMapFilters = function() {
  const psname = document.getElementById('map_psname').value;
  const routeNo = document.getElementById('map_route_no').value;
  const location = document.getElementById('map_location').value;
  const category = document.getElementById('map_categorization_filter').value;

  state.filteredMapData = state.data.filter(item => {
    if (psname && item.psPolice !== psname) return false;
    if (routeNo && item.route !== routeNo) return false;
    if (category && item.sensitivity !== category) return false;
    if (location && !item.pslName.toLowerCase().includes(location.toLowerCase())) return false;
    return true;
  });

  renderMapStationsAndRoutes();
};

window.resetMapFilters = function() {
  document.getElementById('map_psname').value = '';
  document.getElementById('map_route_no').value = '';
  document.getElementById('map_location').value = '';
  document.getElementById('map_categorization_filter').value = '';
  onPSNameChange('');
  applyMapFilters();
};

/**
 * Custom Station Marker Icon matching nex-gen categorization
 */
function getStationIcon(categorization) {
  var cat = (categorization || '').trim().toUpperCase();
  var pinColor = '#10b981'; // Normal
  var label = 'N';

  if (cat === 'HYPER SENSITIVE') {
    pinColor = '#ef4444';
    label = 'H';
  } else if (cat === 'CRITICAL') {
    pinColor = '#991b1b';
    label = 'C';
  } else if (cat === 'SENSITIVE') {
    pinColor = '#f59e0b';
    label = 'S';
  }

  return L.divIcon({
    className: 'custom-cat-pin',
    html: `
      <div style="background-color:${pinColor}; color:#fff; font-size:10px; font-weight:800; border:2px solid #ffffff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.5); cursor:pointer;">
        ${label}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  });
}

/**
 * Render Station Markers and Real Road Routes (OSRM Road Path)
 */
function renderMapStationsAndRoutes() {
  // Clear existing markers
  state.markerLayers.forEach(m => state.map.removeLayer(m));
  state.markerLayers = [];
  state.routeLayerGroup.clearLayers();

  const bounds = [];
  const routeGroups = {};
  const routeStaffMap = {};

  const validStations = state.filteredMapData.filter(d => d.hasCoords);

  validStations.forEach(station => {
    var rNo = station.route ? station.route.toString().trim() : 'Unknown';

    if (station.incharge && !routeStaffMap[rNo]) {
      routeStaffMap[rNo] = {
        staff: station.incharge.replace(/\n/g, ', '),
        ph: station.incharge.match(/\d{10}/) ? station.incharge.match(/\d{10}/)[0] : 'N/A'
      };
    }

    var latLng = [station.lat, station.lng];
    var customIcon = getStationIcon(station.sensitivity);
    var marker = L.marker(latLng, { icon: customIcon });

    var popupContent = `
      <div style="font-family: Arial, sans-serif; font-size: 11px; min-width: 270px; max-width: 320px; line-height: 1.4;">
        <div style="background-color: #1e293b; color: white; padding: 6px 8px; font-weight: bold; font-size: 12px; border-radius: 4px 4px 0 0; display:flex; justify-content:space-between; align-items:center;">
          <span>${station.psPolice || 'N/A'}</span>
          <span style="font-size: 10px; opacity: 0.9; font-family: monospace;">(Code: ${station.code || 'N/A'})</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569; width: 45%;">Mandal / ZPTC:</td>
            <td style="padding: 3px;">${station.mandal || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">MPTC Segment:</td>
            <td style="padding: 3px;">${station.mptc || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">Route No:</td>
            <td style="padding: 3px; font-weight:bold; color:#d97706;">Route - ${station.route || 'N/A'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">Route Staff Details:</td>
            <td style="padding: 3px; font-weight: bold; color: #1d4ed8;">${escapeHtml(station.incharge.split('\n')[0])}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">Location:</td>
            <td style="padding: 3px;">${escapeHtml(station.pslName)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">No. of Voters:</td>
            <td style="padding: 3px;"><b>${station.voters || '0'}</b></td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">BLO Contact No:</td>
            <td style="padding: 3px;"><a href="tel:${station.blo}" style="color:#059669; font-weight:bold;">${station.blo || 'N/A'}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">Distance (Kms):</td>
            <td style="padding: 3px;">${station.distanceKm || 'N/A'} KM</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 3px; font-weight: bold; color: #475569;">Sensitivity:</td>
            <td style="padding: 3px;"><span style="background: ${station.sensitivity === 'HYPER SENSITIVE' ? '#fee2e2; color:#991b1b' : (station.sensitivity === 'SENSITIVE' ? '#fef3c7; color:#92400e' : '#dcfce7; color:#166534')}; padding: 1px 4px; border-radius: 3px; font-weight: bold;">${station.sensitivity}</span></td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 6px 3px 3px 3px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank" 
                 style="display:block; text-align:center; background:#2563eb; color:#fff; padding:4px 8px; border-radius:4px; font-weight:bold; text-decoration:none;">
                🧭 Google Maps Navigation
              </a>
            </td>
          </tr>
        </table>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 320 });
    marker.addTo(state.map);
    state.markerLayers.push(marker);
    bounds.push(latLng);

    if (!routeGroups[rNo]) {
      routeGroups[rNo] = [];
    }
    routeGroups[rNo].push(latLng);
  });

  // Draw Real Road Driving Routes using OSRM
  drawRoadRoutes(routeGroups, routeStaffMap);

  // Update Top Left Route Summary Chip if filtered by Route
  const routeNo = document.getElementById('map_route_no').value;
  const psname = document.getElementById('map_psname').value;
  const chip = document.getElementById('route-summary-chip');

  if (routeNo && validStations.length > 0) {
    document.getElementById('route-chip-title').textContent = `${psname || 'Police'} Route - ${routeNo}`;
    document.getElementById('route-chip-count').textContent = `${validStations.length} Polling Stations`;
    const gmapsMulti = validStations.map(s => `${s.lat},${s.lng}`).join('/');
    document.getElementById('route-chip-gmaps').href = `https://www.google.com/maps/dir/${gmapsMulti}`;
    chip.classList.remove('hidden');
  } else {
    chip.classList.add('hidden');
  }

  // Auto-fit bounds
  if (bounds.length > 0) {
    state.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

/**
 * Draw Real Road Driving Routes via OSRM (Exact nex-gen.in road tracking)
 */
async function drawRoadRoutes(routeGroups, routeStaffMap) {
  for (var rNo in routeGroups) {
    var coords = routeGroups[rNo];
    if (coords.length > 1) {
      // Build OSRM URL: lon,lat;lon,lat...
      var coordString = coords.map(c => c[1] + ',' + c[0]).join(';');
      var url = 'https://router.project-osrm.org/route/v1/driving/' + coordString + '?overview=full&geometries=geojson';

      let staffInfo = routeStaffMap[rNo] ? routeStaffMap[rNo] : { staff: 'N/A', ph: 'N/A' };
      let popupText = `<b>Route No:</b> ${rNo}<br><b>Route Staff:</b> ${staffInfo.staff}<br><b>Phone:</b> ${staffInfo.ph} (Road Path)`;

      try {
        let response = await fetch(url);
        let data = await response.json();
        if (data.routes && data.routes.length > 0) {
          let routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          var polyline = L.polyline(routeCoords, {
            color: '#ef4444',
            weight: 4,
            opacity: 0.85
          }).bindPopup(popupText);

          state.routeLayerGroup.addLayer(polyline);
        } else {
          fallbackStraightLine(coords, rNo, popupText);
        }
      } catch (e) {
        fallbackStraightLine(coords, rNo, popupText);
      }
    }
  }
}

function fallbackStraightLine(coords, rNo, popupText) {
  popupText = popupText.replace('(Road Path)', '(Direct Line)');
  var polyline = L.polyline(coords, {
    color: '#ef4444',
    weight: 3,
    opacity: 0.7,
    dashArray: '5, 5'
  }).bindPopup(popupText);
  state.routeLayerGroup.addLayer(polyline);
}

/**
 * Polling Stations Report Page Logic
 */
window.filterReport = function() {
  const mandal = document.getElementById('report_mandal_filter').value;
  const category = document.getElementById('report_category_filter').value;
  const search = document.getElementById('report_search').value.toLowerCase().trim();

  state.filteredReportData = state.data.filter(item => {
    if (mandal && item.mandal !== mandal) return false;
    if (category && item.sensitivity !== category) return false;
    if (search) {
      const match = 
        item.pslName.toLowerCase().includes(search) ||
        item.blo.toLowerCase().includes(search) ||
        item.psPolice.toLowerCase().includes(search) ||
        item.mptc.toLowerCase().includes(search) ||
        item.route.toLowerCase().includes(search);
      if (!match) return false;
    }
    return true;
  });

  state.reportPage = 1;
  renderReportTable();
};

function renderReportTable() {
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  const total = state.filteredReportData.length;
  document.getElementById('report-total-badge').textContent = `Total Records: ${total}`;

  const startIdx = (state.reportPage - 1) * state.reportPageSize;
  const endIdx = Math.min(startIdx + state.reportPageSize, total);
  const items = state.filteredReportData.slice(startIdx, endIdx);

  document.getElementById('report-pagination-info').textContent = 
    `Showing ${total > 0 ? startIdx + 1 : 0} to ${endIdx} of ${total} records`;

  renderReportPagination(Math.ceil(total / state.reportPageSize));

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" class="p-6 text-center text-gray-400">No polling stations found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(s => {
    const badgeColor = s.sensitivity === 'HYPER SENSITIVE' ? 'bg-red-100 text-red-800' : (s.sensitivity === 'SENSITIVE' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800');

    return `
      <tr class="hover:bg-gray-50 transition border-b">
        <td class="p-2 border-r font-mono text-gray-500">${s.sno}</td>
        <td class="p-2 border-r font-semibold">${escapeHtml(s.mandal)}</td>
        <td class="p-2 border-r text-gray-600">${escapeHtml(s.mptc)}</td>
        <td class="p-2 border-r font-bold text-amber-600">R-${s.route}</td>
        <td class="p-2 border-r">${escapeHtml(s.psPolice)}</td>
        <td class="p-2 border-r max-w-xs truncate" title="${escapeHtml(s.pslName)}">${escapeHtml(s.pslName.split('\n')[0])}</td>
        <td class="p-2 border-r text-center font-bold text-blue-600">${s.voters}</td>
        <td class="p-2 border-r font-mono">${s.blo ? `<a href="tel:${s.blo}" class="text-green-600 hover:underline font-semibold">${s.blo}</a>` : '-'}</td>
        <td class="p-2 border-r text-center">${s.distanceKm || '-'} KM</td>
        <td class="p-2 border-r text-center"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor}">${s.sensitivity}</span></td>
        <td class="p-2 border-r text-gray-600">PC:${s.pc||0}, HG:${s.hg||0}</td>
        <td class="p-2 text-center whitespace-nowrap">
          <button onclick="openEditModal('${s.id}')" class="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700 mr-1">
            Edit
          </button>
          ${s.hasCoords ? `
            <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" class="px-2 py-0.5 bg-gray-800 text-amber-400 rounded text-[10px] hover:bg-gray-700 font-semibold">
              Nav
            </a>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function renderReportPagination(totalPages) {
  const container = document.getElementById('report-pagination-btns');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  const start = Math.max(1, state.reportPage - 2);
  const end = Math.min(totalPages, state.reportPage + 2);

  for (let p = start; p <= end; p++) {
    html += `
      <button onclick="changeReportPage(${p})" class="px-2 py-1 rounded border text-[10px] font-semibold ${p === state.reportPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}">
        ${p}
      </button>
    `;
  }
  container.innerHTML = html;
}

window.changeReportPage = function(page) {
  state.reportPage = page;
  renderReportTable();
};

/**
 * PS Route Wise View (Cards with OSRM and Multi-Stop Navigation)
 */
function renderRouteWiseCards() {
  const container = document.getElementById('route-wise-cards-container');
  if (!container) return;

  const selectedPS = document.getElementById('route_wise_ps_filter').value;
  const filtered = selectedPS ? state.data.filter(d => d.psPolice === selectedPS) : state.data;

  // Group by psPolice and route
  const groups = {};
  filtered.forEach(item => {
    const key = `${item.psPolice}__${item.route}`;
    if (!groups[key]) {
      groups[key] = {
        psPolice: item.psPolice,
        route: item.route,
        mandal: item.mandal,
        stations: []
      };
    }
    groups[key].stations.push(item);
  });

  const keys = Object.keys(groups).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div class="bg-white p-6 rounded shadow text-center text-gray-500">No routes found for selected filter.</div>';
    return;
  }

  container.innerHTML = keys.map(k => {
    const g = groups[k];
    const stations = g.stations.sort((a,b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
    const validStations = stations.filter(s => s.hasCoords);
    const totalVoters = stations.reduce((a,c) => a + c.voters, 0);

    const gmapsMulti = validStations.length > 0 
      ? `https://www.google.com/maps/dir/${validStations.map(s => `${s.lat},${s.lng}`).join('/')}`
      : '#';

    return `
      <div class="bg-white rounded-lg p-4 shadow border border-gray-200">
        <div class="flex flex-wrap justify-between items-center pb-3 border-b gap-2">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">Route - ${g.route}</span>
              <h3 class="text-sm font-bold text-gray-900">${escapeHtml(g.psPolice)} (${escapeHtml(g.mandal)} Mandal)</h3>
            </div>
            <div class="flex flex-wrap gap-3 mt-1.5 text-[11px] text-gray-600">
              <span>Stations: <strong class="text-gray-900">${stations.length}</strong></span>
              <span>Total Voters: <strong class="text-blue-600">${totalVoters.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="viewRouteOnMap('${escapeHtml(g.psPolice)}', '${escapeHtml(g.route)}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow">
              <i class="fa-solid fa-map mr-1"></i> View on Map
            </button>
            ${validStations.length > 0 ? `
              <a href="${gmapsMulti}" target="_blank" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold shadow flex items-center space-x-1">
                <i class="fa-solid fa-diamond-turn-right"></i>
                <span>Google Navigation</span>
              </a>
            ` : ''}
          </div>
        </div>

        <div class="mt-3">
          <div class="text-[10px] uppercase font-bold text-gray-500 mb-1.5">Sequential Polling Stations:</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            ${stations.map((s, idx) => `
              <div class="p-2 rounded bg-gray-50 border border-gray-200 flex items-start space-x-2">
                <span class="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-gray-800 truncate" title="${escapeHtml(s.pslName)}">${escapeHtml(s.pslName.split('\n')[0])}</div>
                  <div class="text-[10px] text-gray-500">MPTC: ${escapeHtml(s.mptc)} | ${s.voters} Voters</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.viewRouteOnMap = function(psname, route) {
  switchView('map');
  document.getElementById('map_psname').value = psname;
  onPSNameChange(psname);
  document.getElementById('map_route_no').value = route;
  applyMapFilters();
};

/**
 * PS Wise Map (All stations clustered)
 */
function initPsAllMap() {
  if (!state.psAllMap) {
    state.psAllMap = L.map('ps-all-map').setView([18.35, 84.0], 10);
    L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps'
    }).addTo(state.psAllMap);

    const cluster = L.markerClusterGroup({ maxClusterRadius: 40 });
    state.data.filter(d => d.hasCoords).forEach(s => {
      const m = L.marker([s.lat, s.lng], { icon: getStationIcon(s.sensitivity) });
      m.bindPopup(`<b>${escapeHtml(s.pslName.split('\n')[0])}</b><br>PS: ${s.psPolice}<br>Route: ${s.route}<br>Sensitivity: ${s.sensitivity}`);
      cluster.addLayer(m);
    });
    state.psAllMap.addLayer(cluster);
  }
  setTimeout(() => { if (state.psAllMap) state.psAllMap.invalidateSize(); }, 200);
}

/**
 * Add / Edit Polling Station Modal Logic
 */
window.openAddModal = function() {
  document.getElementById('modal-title').textContent = 'Add New Polling Station';
  document.getElementById('edit_id').value = '';
  document.getElementById('station-form').reset();
  document.getElementById('editModal').classList.remove('hidden');
};

window.openEditModal = function(id) {
  const station = state.data.find(d => d.id === id);
  if (!station) return;

  document.getElementById('modal-title').textContent = 'Edit Polling Station Details';
  document.getElementById('edit_id').value = station.id;
  document.getElementById('edit_mandal').value = station.mandal;
  document.getElementById('edit_mptc').value = station.mptc;
  document.getElementById('edit_route').value = station.route;
  document.getElementById('edit_psname').value = station.psPolice;
  document.getElementById('edit_location').value = station.pslName;
  document.getElementById('edit_voters').value = station.voters;
  document.getElementById('edit_blo').value = station.blo;
  document.getElementById('edit_distance').value = station.distanceKm;
  document.getElementById('edit_sensitivity').value = station.sensitivity;
  document.getElementById('edit_lat').value = station.lat || '';
  document.getElementById('edit_lng').value = station.lng || '';

  document.getElementById('editModal').classList.remove('hidden');
};

window.closeEditModal = function() {
  document.getElementById('editModal').classList.add('hidden');
};

window.saveStation = function() {
  const id = document.getElementById('edit_id').value || Date.now().toString();
  const stationObj = {
    mandal: document.getElementById('edit_mandal').value.trim(),
    mptc: document.getElementById('edit_mptc').value.trim(),
    route: document.getElementById('edit_route').value.trim(),
    psPolice: document.getElementById('edit_psname').value.trim(),
    pslName: document.getElementById('edit_location').value.trim(),
    voters: parseInt(document.getElementById('edit_voters').value) || 0,
    blo: document.getElementById('edit_blo').value.trim(),
    distanceKm: document.getElementById('edit_distance').value.trim(),
    sensitivity: document.getElementById('edit_sensitivity').value,
    lat: parseFloat(document.getElementById('edit_lat').value) || null,
    lng: parseFloat(document.getElementById('edit_lng').value) || null
  };

  const localEdits = JSON.parse(localStorage.getItem('local_election_stations') || '{}');
  localEdits[id] = stationObj;
  localStorage.setItem('local_election_stations', JSON.stringify(localEdits));

  closeEditModal();
  loadData().then(() => {
    applyMapFilters();
    renderReportTable();
    renderRouteWiseCards();
    alert('Station saved successfully!');
  });
};

/**
 * Export CSV Report
 */
window.exportCSV = function() {
  const headers = ['S.No', 'Mandal', 'MPTC', 'Route', 'PS Name', 'Location', 'Voters', 'BLO', 'Distance', 'Sensitivity'];
  const rows = state.filteredReportData.map(s => [
    s.sno, `"${s.mandal}"`, `"${s.mptc}"`, s.route, `"${s.psPolice}"`, `"${s.pslName.replace(/"/g, '""')}"`, s.voters, `"${s.blo}"`, s.distanceKm, s.sensitivity
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Election_Report_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
