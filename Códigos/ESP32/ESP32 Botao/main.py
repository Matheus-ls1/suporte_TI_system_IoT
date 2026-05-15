import network
import urequests
import json
from machine import Pin, SoftI2C
from i2c_lcd import I2cLcd
import time

# --- Configurações da Rede e Servidor ---
WIFI_SSID = "Oi technicolor" # Nome da rede
WIFI_SENHA = "96625795" # Senha da rede
URL_SERVIDOR = "http://192.168.1.50:5000/chamado" 

# --- IP FIXO ---
MEU_IP = '192.168.1.21'
MASCARA = '255.255.255.0'
GATEWAY = '192.168.1.1'
DNS = '8.8.8.8'  # DNS do Google padrão para garantir saída
# ------------------------------------


# --- Configuração dos LEDs ---
led_amarelo = Pin(12, Pin.OUT)
led_verde = Pin(14, Pin.OUT)
led_vermelho = Pin(27, Pin.OUT)

# --- Configuração do Display LCD (I2C) ---
i2c = SoftI2C(sda=Pin(21), scl=Pin(22), freq=400000)
ENDERECO_I2C = 0x27
lcd = I2cLcd(i2c, ENDERECO_I2C, 2, 16)

# --- Configuração do Encoder ---
clk = Pin(32, Pin.IN)
dt = Pin(33, Pin.IN)
sw = Pin(25, Pin.IN, Pin.PULL_UP)

# --- Variáveis do Menu ---
opcoes = ["Prob. Projetor", "Prob. Computador", "Prob. Internet"]
indice = 0
estado_anterior_clk = clk.value()

# --- Função de Conexão Wi-Fi ---
def conectar_wifi():
    estacao = network.WLAN(network.STA_IF)
    estacao.active(True)
    
    if not estacao.isconnected():
        lcd.clear()
        lcd.putstr("Conectando...")
        lcd.move_to(0, 1)
        lcd.putstr("Wi-Fi...")

	# Aplica a regra do IP estático ANTES de conectar
	estacao.ifconfig((MEU_IP, MASCARA, GATEWAY, DNS))

        estacao.connect(WIFI_SSID, WIFI_SENHA)
        
        while not estacao.isconnected():
            time.sleep(0.5)
            
    lcd.clear()
    lcd.putstr("Wi-Fi Conectado!")
    time.sleep(1.5)

def atualizar_tela():
    lcd.clear()
    lcd.putstr("Selecione:")
    lcd.move_to(0, 1)
    lcd.putstr("> " + opcoes[indice])

# --- Inicialização ---
conectar_wifi()
atualizar_tela()

# --- Loop Principal ---
while True:
    estado_atual_clk = clk.value()
    
    # 1. Detecta o giro do Encoder
    if estado_atual_clk != estado_anterior_clk and estado_atual_clk == 1:
        if dt.value() != estado_atual_clk:
            indice = (indice + 1) % len(opcoes) # Gira direita
        else:
            indice = (indice - 1) % len(opcoes) # Gira esquerda
            
        atualizar_tela()
        
    estado_anterior_clk = estado_atual_clk
    
    # 2. Detecta o clique no botão do Encoder
    if sw.value() == 0:
        lcd.clear()
        lcd.putstr("Enviando...")
        led_amarelo.value(1) # Acende LED amarelo indicando processamento
        
        # Monta o pacote de dados do chamado
        dados = {
            "titulo": opcoes[indice],
            "descricao": "Chamado aberto Bloco 10 - Sala 1."
        }
        
        try:
            cabecalho = {'Content-Type': 'application/json'}
            resposta = urequests.post(URL_SERVIDOR, json=dados, headers=cabecalho)
            
            # Se o servidor respondeu com sucesso (200 ou 201)
            if resposta.status_code == 201 or resposta.status_code == 200:
                led_amarelo.value(0)
                led_verde.value(1) # Acende Verde!
                lcd.clear()
                lcd.putstr("Chamado Aberto!")
                lcd.move_to(0, 1)
                lcd.putstr("TI a caminho")
            else:
                raise Exception("Erro no servidor")
                
            resposta.close()
            
        except Exception as e:
            # Em caso de falha no Wi-Fi ou servidor offline
            led_amarelo.value(0)
            led_vermelho.value(1) # Acende Vermelho!
            lcd.clear()
            lcd.putstr("Falha na Rede")
            lcd.move_to(0, 1)
            lcd.putstr("Tente Novamente")
            print("Erro Técnico:", e)
            
        time.sleep(3) # Mantém a mensagem de sucesso/erro na tela por 3 segundos
        led_verde.value(0)
        led_vermelho.value(0)
        atualizar_tela() # Volta para o menu de opções
        
    time.sleep_ms(1)

