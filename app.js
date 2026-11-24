const voltText = document.querySelector('#voltageDisplay');
const currText = document.querySelector('#currentDisplay');
const connectBtn = document.querySelector('#connectBleBtn');

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let isBleConnected = false;
const nominalVoltage = 3.32;
const circuitResistance = 313.2;

function renderValues(voltageVal, currentMAVal) {
  if (!voltText || !currText) return;
  if (!Number.isFinite(voltageVal) || !Number.isFinite(currentMAVal)) return;

  voltText.setAttribute('value', `${voltageVal.toFixed(2)} V`);
  currText.setAttribute('value', `${currentMAVal.toFixed(1)} mA`);
}

// Simulasi lokal aktif selama BLE belum terhubung
setInterval(() => {
  if (isBleConnected) return;
  const jitter = (Math.random() - 0.5) * 0.08;
  const voltage = Math.max(0.1, nominalVoltage + jitter);
  const currentMA = (voltage / circuitResistance) * 1000;
  renderValues(voltage, currentMA);
}, 400);

async function connectESP32BLE() {
  if (!navigator.bluetooth) {
    alert('Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome atau Edge di HTTPS/localhost.');
    return;
  }

  try {
    connectBtn.textContent = 'Connecting...';
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'ESP32_Ohm_INA' }],
      optionalServices: [SERVICE_UUID]
    });

    device.addEventListener('gattserverdisconnected', () => {
      isBleConnected = false;
      connectBtn.textContent = 'Connect BLE (ESP32)';
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    await characteristic.startNotifications();
    isBleConnected = true;
    connectBtn.textContent = 'BLE Connected';

    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const decoder = new TextDecoder('utf-8');
      const rawText = decoder.decode(event.target.value);
      try {
        const data = JSON.parse(rawText);
        const v = parseFloat(data.v);
        const i = parseFloat(data.i);
        if (Number.isFinite(v) && Number.isFinite(i)) {
          renderValues(v, i);
        }
      } catch (err) {
        console.warn('Format JSON BLE tidak valid:', rawText, err);
      }
    });
  } catch (error) {
    isBleConnected = false;
    connectBtn.textContent = 'Connect BLE (ESP32)';
    console.error('Koneksi BLE gagal:', error);
  }
}

if (connectBtn) {
  connectBtn.addEventListener('click', connectESP32BLE);
}
