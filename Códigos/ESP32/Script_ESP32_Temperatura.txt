import network
import time
import machine
import onewire
import ds18x20
import urequests
import json

# ==========================================
# 1. CONFIGURAÇÕES DA REDE E DO SERVIDOR
# ==========================================
WIFI_SSID = "Oi technicolor"    
WIFI_SENHA = "96625795"  
URL_SERVIDOR = "http://192.168.1.50:5000/temperatura"
NOME_DO_SENSOR = "ESP32_Temperatura"

# --- IP FIXO ---
MEU_IP = '192.168.1.20'
MASCARA = '255.255.255.0'
GATEWAY = '192.168.1.1'
DNS = '8.8.8.8'  # DNS do Google padrão para garantir saída
# ------------------------------------

# ==========================================
# 2. CONECTANDO NO WI-FI
# ==========================================
estacao = network.WLAN(network.STA_IF)
estacao.active(True)

# Aplica a regra do IP estático ANTES de conectar
estacao.ifconfig((MEU_IP, MASCARA, GATEWAY, DNS))

estacao.connect(WIFI_SSID, WIFI_SENHA)

print(f"Conectando na rede {WIFI_SSID}...")
while not estacao.isconnected():
    time.sleep(1)
    print(".", end="")
    
print("\nWi-Fi Conectado com Sucesso!")
print("IP do ESP32:", estacao.ifconfig()[0])
print("-" * 30)

# ==========================================
# 3. CONFIGURANDO O SENSOR DS18B20
# ==========================================
pino_dados = machine.Pin(4)
sensor = ds18x20.DS18X20(onewire.OneWire(pino_dados))
sensores_encontrados = sensor.scan()

if not sensores_encontrados:
    print("ERRO: Nenhum sensor encontrado! Verifique as ligações.")
else:
    print("Sensor OK! Iniciando envio de dados para o Servidor...")
    print("-" * 30)
    
    # ==========================================
    # 4. LOOP PRINCIPAL (Lê e Envia)
    # ==========================================
    while True:
        try:
            # Pede para o sensor medir
            sensor.convert_temp()
            time.sleep_ms(750)
  
            temperatura = sensor.read_temp(sensores_encontrados[0])
            
            print(f"Lida: {temperatura:.2f} °C", end=" -> ")
            
            # Monta o pacote de dados igual fizemos no teste do Linux
            dados = {
                "sensor": NOME_DO_SENSOR,
                "graus": temperatura
            }
            
            # Dispara para o servidor Flask
            cabecalho = {'Content-Type': 'application/json'}
            resposta = urequests.post(URL_SERVIDOR, json=dados, headers=cabecalho)
    
            print(f"Servidor respondeu: {resposta.text.strip()}")
            resposta.close() # Fecha a conexão para não travar a memória do ESP32
            
        except OSError as e:
            print(f"Erro de conexão com o Wi-Fi ou Servidor: {e}")
        except Exception as e:
            print(f"Erro inesperado: {e}")
            
        # Espera 10 segundos antes de enviar de novo para não sobrecarregar o servidor
        time.sleep(10)