// ==================== LOGIN SYSTEM ====================
const LOGIN_KEY = 'excel_matcher_logged';
const USERNAME_KEY = 'excel_matcher_user';

const VALID_CREDENTIALS = {
    admin: 'admin123',
    user: 'user123'
};

function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem(LOGIN_KEY);
    if (isLoggedIn === 'true') {
        const username = sessionStorage.getItem(USERNAME_KEY) || 'User';
        showMainContent(username);
    } else {
        showLoginForm();
    }
}

function showLoginForm() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
}

function showMainContent(username) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('loggedUser').innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
}

function login(username, password) {
    if (VALID_CREDENTIALS[username] && VALID_CREDENTIALS[username] === password) {
        sessionStorage.setItem(LOGIN_KEY, 'true');
        sessionStorage.setItem(USERNAME_KEY, username);
        showMainContent(username);
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
    resetAppData();
    showLoginForm();
}

function resetAppData() {
    file1Data = null;
    file2Data = null;
    file1Headers = [];
    file2Headers = [];
    processedData = null;
    processedHeaders = [];
    document.getElementById('file1').value = '';
    document.getElementById('file2').value = '';
    document.getElementById('file1Info').style.display = 'none';
    document.getElementById('file2Info').style.display = 'none';
    document.getElementById('targetCol1').innerHTML = '<option value="">-- Pilih Kolom --</option>';
    document.getElementById('targetCol2').innerHTML = '<option value="">-- Pilih Kolom --</option>';
    document.getElementById('targetCol1').disabled = true;
    document.getElementById('targetCol2').disabled = true;
    document.getElementById('targetRow').value = '';
    document.getElementById('validationCol').value = 'Validasi';
    document.getElementById('preview1').innerHTML = '';
    document.getElementById('preview2').innerHTML = '';
    document.getElementById('processBtn').disabled = true;
    document.getElementById('downloadBtn').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    if (login(username, password)) {
        errorDiv.style.display = 'none';
        initApp();
    } else {
        errorDiv.textContent = 'Username atau password salah!';
        errorDiv.style.display = 'block';
    }
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    logout();
});

// ==================== MAIN APPLICATION ====================
let file1Data = null, file2Data = null, file1Headers = [], file2Headers = [], processedData = null, processedHeaders = [];

const file1Input = document.getElementById('file1');
const file2Input = document.getElementById('file2');
const targetCol1Select = document.getElementById('targetCol1');
const targetCol2Select = document.getElementById('targetCol2');
const targetRowInput = document.getElementById('targetRow');
const validationColInput = document.getElementById('validationCol');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingDiv = document.getElementById('loading');
const resultCard = document.getElementById('resultCard');

function initApp() {}

file1Input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file1Name').textContent = file.name;
        document.getElementById('file1Info').style.display = 'block';
        try {
            const data = await readExcelFile(file);
            file1Data = data.data;
            file1Headers = data.headers;
            document.getElementById('file1Details').textContent = `${file1Data.length} baris, ${file1Headers.length} kolom`;
            updateColumnDropdown(targetCol1Select, file1Headers);
            showPreview('preview1', file1Data, file1Headers);
            checkReadyToProcess();
        } catch (error) {
            alert('Error membaca file 1: ' + error.message);
        }
    }
});

file2Input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('file2Name').textContent = file.name;
        document.getElementById('file2Info').style.display = 'block';
        try {
            const data = await readExcelFile(file);
            file2Data = data.data;
            file2Headers = data.headers;
            document.getElementById('file2Details').textContent = `${file2Data.length} baris, ${file2Headers.length} kolom`;
            updateColumnDropdown(targetCol2Select, file2Headers);
            showPreview('preview2', file2Data, file2Headers);
            checkReadyToProcess();
        } catch (error) {
            alert('Error membaca file 2: ' + error.message);
        }
    }
});

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
            if (jsonData.length === 0) reject(new Error('File kosong atau tidak memiliki data'));
            const headers = Object.keys(jsonData[0]);
            const rows = jsonData.map(row => headers.map(h => row[h] || ""));
            resolve({ headers, data: rows });
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
        reader.readAsArrayBuffer(file);
    });
}

function updateColumnDropdown(selectElement, headers) {
    selectElement.innerHTML = '<option value="">-- Pilih Kolom --</option>';
    headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        selectElement.appendChild(option);
    });
    selectElement.disabled = false;
}

function showPreview(containerId, data, headers) {
    const container = document.getElementById(containerId);
    if (!data || data.length === 0) {
        container.innerHTML = '<p class="text-muted">Tidak ada data untuk ditampilkan</p>';
        return;
    }
    const previewData = data.slice(0, 10);
    let html = '<div style="overflow-x: auto;"><table class="table table-sm table-bordered"><thead><tr>';
    headers.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
    html += '</tr></thead><tbody>';
    previewData.forEach(row => {
        html += '<tr>';
        row.forEach(cell => html += `<td>${escapeHtml(String(cell))}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';
    if (data.length > 10) html += `<p class="text-muted mt-2">Menampilkan 10 dari ${data.length} baris</p>`;
    html += '</div>';
    container.innerHTML = html;
}

function checkReadyToProcess() {
    processBtn.disabled = !(file1Data && file2Data && targetCol1Select.value && targetCol2Select.value);
}

processBtn.addEventListener('click', () => {
    const targetCol1 = targetCol1Select.value;
    const targetCol2 = targetCol2Select.value;
    const validationColName = validationColInput.value || 'Validasi';
    const targetRow = targetRowInput.value === '' ? null : parseInt(targetRowInput.value);
    if (targetRow !== null && (targetRow < 0 || targetRow >= file1Data.length)) {
        alert(`Baris target harus antara 0 dan ${file1Data.length - 1}`);
        return;
    }
    const col1Index = file1Headers.indexOf(targetCol1);
    const col2Index = file2Headers.indexOf(targetCol2);
    if (col1Index === -1 || col2Index === -1) {
        alert('Kolom target tidak ditemukan');
        return;
    }
    loadingDiv.style.display = 'block';
    processBtn.disabled = true;
    setTimeout(() => {
        try {
            processedHeaders = [...file1Headers, validationColName];
            processedData = [];
            let matchCount = 0, unmatchCount = 0;
            const file2Values = new Set(file2Data.map(row => String(row[col2Index]).trim()));
            if (targetRow !== null) {
                const cellValue = String(file1Data[targetRow][col1Index]).trim();
                if (file2Values.has(cellValue)) {
                    processedData.push([...file1Data[targetRow], 'NOT OK']);
                    matchCount++;
                } else {
                    processedData.push([...file1Data[targetRow], 'OK']);
                    unmatchCount++;
                }
            } else {
                for (let i = 0; i < file1Data.length; i++) {
                    const cellValue = String(file1Data[i][col1Index]).trim();
                    if (file2Values.has(cellValue)) {
                        processedData.push([...file1Data[i], 'NOT OK']);
                        matchCount++;
                    } else {
                        processedData.push([...file1Data[i], 'OK']);
                        unmatchCount++;
                    }
                }
            }
            displayResults(matchCount, unmatchCount, targetRow);
            showPreview('resultPreview', processedData, processedHeaders);
            downloadBtn.style.display = 'inline-block';
            resultCard.style.display = 'block';
        } catch (error) {
            alert('Error saat memproses data: ' + error.message);
        } finally {
            loadingDiv.style.display = 'none';
            processBtn.disabled = false;
        }
    }, 100);
});

function displayResults(matchCount, unmatchCount, targetRow) {
    const statsDiv = document.getElementById('resultStats');
    const total = matchCount + unmatchCount;
    let html = `<div class="row text-center">
        <div class="col-md-4"><div class="stat-number">${total}</div><div>Total Data</div></div>
        <div class="col-md-4"><div class="stat-number" style="color:#ffeb3b;">${matchCount}</div><div>Data MATCH <span class="badge bg-danger">NOT OK</span></div><small>Data ditemukan di kedua file</small></div>
        <div class="col-md-4"><div class="stat-number" style="color:#a5d6a7;">${unmatchCount}</div><div>Data TIDAK MATCH <span class="badge bg-success">OK</span></div><small>Data hanya di File 1</small></div>`;
    if (targetRow !== null) html += `<div class="col-12 mt-3"><div class="alert alert-info"><i class="fas fa-info-circle"></i> Memproses baris target: ${targetRow}</div></div>`;
    html += `</div>`;
    statsDiv.innerHTML = html;
}

downloadBtn.addEventListener('click', () => {
    if (!processedData || !processedHeaders) {
        alert('Tidak ada data untuk diunduh');
        return;
    }
    const wsData = [processedHeaders, ...processedData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Pencocokan');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(wb, `hasil_pencocokan_${timestamp}.xlsx`);
    const toast = document.createElement('div');
    toast.className = 'alert alert-success position-fixed bottom-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = '<i class="fas fa-check-circle"></i> File berhasil diunduh!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

targetCol1Select.addEventListener('change', checkReadyToProcess);
targetCol2Select.addEventListener('change', checkReadyToProcess);

// ==================== DROPDOWN EXTERNAL LINKS ====================
const dropdownItems = document.querySelectorAll('.dropdown-item[data-link]');
dropdownItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const url = this.getAttribute('data-link');
        const target = this.getAttribute('target') || '_blank';
        if (url) window.open(url, target);
    });
});

checkLoginStatus();