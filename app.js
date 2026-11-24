// Grab DOM elements
const voltText = document.querySelector('#voltageDisplay');
const currText = document.querySelector('#currentDisplay');
const connectBtn = document.querySelector('#connectBleBtn');

// BLE UUIDs (harus sama dengan kode ESP32)
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

// Simulation parameters (sesuai program awal)
let voltage = 3.32;
const circuitResistance = 313.2; // Ohms (V / I = 3.32V / 10.6mA)
let isBleConnected = false;

function renderValues(voltageVal, currentMAVal) {
  if (!voltText || !currText) return;
  if (!Number.isFinite(voltageVal) || !Number.isFinite(currentMAVal)) return;

  voltText.setAttribute('value', `${voltageVal.toFixed(2)} V`);
  currText.setAttribute('value', `${currentMAVal.toFixed(1)} mA`);
}

// Update loop (runs every 400ms) — aktif saat tidak ada koneksi Bluetooth
setInterval(() => {
  if (isBleConnected) return;

  // Add slight natural noise/fluctuation
  const jitter = (Math.random() - 0.5) * 0.08;
  voltage = Math.max(0.1, voltage + jitter);

  // Calculate Current via Ohm's Law: I = (V / R) * 1000 (mA)
  const currentMA = (voltage / circuitResistance) * 1000;

  // Render to AR elements
  renderValues(voltage, currentMA);
}, 400);

async function connectESP32BLE() {
  if (!navigator.bluetooth) {
    alert('Browser ini tidak mendukung Web Bluetooth. Program tetap berjalan dalam mode simulasi.');
    return;
  }

  try {
    if (connectBtn) connectBtn.textContent = 'Connecting...';

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });

    device.addEventListener('gattserverdisconnected', () => {
      isBleConnected = false;
      if (connectBtn) connectBtn.textContent = 'Connect BLE (ESP32)';
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    await characteristic.startNotifications();
    isBleConnected = true;
    if (connectBtn) connectBtn.textContent = 'BLE Connected';

    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const decoder = new TextDecoder('utf-8');
      const rawText = decoder.decode(event.target.value);
      try {
        const data = JSON.parse(rawText);
        const v = parseFloat(data.v);
        const i = parseFloat(data.i);
        if (Number.isFinite(v) && Number.isFinite(i)) {
          voltage = v; // sinkronkan nilai terakhir agar transisi halus jika BLE terputus
          renderValues(v, i);
        }
      } catch (err) {
        console.warn('Invalid BLE JSON payload:', rawText, err);
      }
    });
  } catch (error) {
    isBleConnected = false;
    if (connectBtn) connectBtn.textContent = 'Connect BLE (ESP32)';
    console.warn('BLE tidak terhubung, tetap memakai mode simulasi:', error);
  }
}

if (connectBtn) {
  connectBtn.addEventListener('click', connectESP32BLE);
}
