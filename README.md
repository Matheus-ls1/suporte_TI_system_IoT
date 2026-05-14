🚀 Guia de Implantação: Sistema Integrado Monitor TI

Este documento descreve o passo a passo para configurar, compilar e executar o ambiente de produção do sistema Monitor TI, englobando Infraestrutura de Rede, Servidor Linux, Backend (Flask), Frontend (React/SPA), Servidor de Arquivos (NAS Samba) e Dispositivos IoT (ESP32).

🗺️ 1. Topologia e Endereçamento de Rede

Antes de iniciar qualquer configuração de software, a rede física deve estar conectada e configurada conforme a tabela abaixo, garantindo a Separação Lógica exigida pelo escopo:

| 🖥️ Equipamento / Usuário | ⚙️ Função | 🌐 Endereço IP | 🔧 Configuração |
| :--- | :--- | :--- | :--- |
| **Modem Principal** | Gateway, DNS e DHCP | `192.168.1.1` | Roteador Borda |
| **Switch** | Conectar computadores principais | `192.168.1.253` | IP Estático (Manual)/ DCHP Desable |
| **PC da TI (Windows)** | Estação de Administração | `192.168.1.10` | IP Estático (Manual) |
| **Celular da TI** | Acesso Administrativo | `192.168.1.11` | IP Estático (Manual) |
| **ESP32 (Temperatura)** | Móvel Sensor Térmico | `192.168.1.20` | IP Estático (Código Python) |
| **ESP32 (Botão)** | Acionador Físico | `192.168.1.21` | IP Estático (Código Python) |
| **Servidor Ubuntu** | Web, API, BD e NAS | `192.168.1.50` | IP Estático (Manual) |
| **Professores / Alunos** | Usuários comuns da Rede | `192.168.1.100` a `252` | DHCP Dinâmico |

DHCP Dinâmico

⚠️ Nota: O Roteador Principal deve ter seu pool de DHCP configurado estritamente para a faixa .100 até .252.

🐧 2. Configuração do Servidor Linux (Ubuntu)

📦 2.1. Instalação de Dependências

Acesse o terminal do Servidor Ubuntu (192.168.1.50) e instale os pacotes necessários:

sudo apt update
sudo apt install python3 python3-pip samba ufw -y
pip3 install flask flask-sqlalchemy flask-cors


📁 2.2. Configuração do NAS (Samba)

Crie o usuário, a pasta segura e atribua as permissões necessárias:

sudo mkdir -p /mnt/NAS_Seguro
sudo adduser tecnico_TI
sudo chown -R tecnico_TI:tecnico_TI /mnt/NAS_Seguro
sudo chmod -R 770 /mnt/NAS_Seguro
sudo smbpasswd -a tecnico_TI


Edite o arquivo de configuração do Samba (sudo nano /etc/samba/smb.conf) e adicione no final do arquivo:

[Arquivos_TI]
comment = Arquivos Confidenciais da TI
path = /mnt/NAS_Seguro
valid users = tecnico_TI
read only = no
browsable = yes
create mask = 0770
directory mask = 0770


Reinicie o serviço para aplicar as configurações:

sudo systemctl restart smbd


🛡️ 2.3. Regras de Firewall (UFW) - Separação Lógica

Aqui você pode atribuir acesso aos IPs que queira que tenham acesso ao NAS. As portas web são públicas, mas o NAS é estritamente restrito aos IPs da TI:

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp # Servidor Web
sudo ufw allow 5000/tcp # API Flask
sudo ufw allow from 192.168.1.10 to any port 139 # NAS PC TI
sudo ufw allow from 192.168.1.10 to any port 445 # NAS PC TI
sudo ufw allow from 192.168.1.11 to any port 139 # NAS Celular TI
sudo ufw allow from 192.168.1.11 to any port 445 # NAS Celular TI
sudo ufw enable


💻 3. Implantação da Aplicação (Backend e Frontend)

⚙️ 3.1. Subindo a API Backend (Flask)

Transfira o arquivo app.py para o servidor (ex: /home/vboxuser/Sistema_TI/app.py). Inicie a API em background (ou deixe em uma aba do terminal dedicada):

source venv/bin/activate
python3 app.py


💡 A API rodará na porta 5000 e criará automaticamente o banco de dados banco_ti.db.

### 🛠️ 3.2. Build, Transferência e Extração do Frontend (React)

Como projetos em React geram uma grande quantidade de arquivos na versão final, a melhor prática é empacotar tudo antes de enviar ao servidor para evitar lentidão ou corrupção na transferência.

**Passo 1: Gerar o Build e Compactar (No ambiente de Desenvolvimento)**
1. No terminal do seu projeto React, rode o comando para gerar os arquivos otimizados de produção:
   ```bash
   npm run build

**Passo2: Transferência para o Servidor Linux**
Mova o arquivo frontend_dist.zip para dentro do Servidor Ubuntu. Você pode fazer isso simplesmente copiando e colando o arquivo na pasta compartilhada do NAS pelo Windows (\\192.168.1.50\Arquivos_TI).

**Passo3: Descompactação no Terminal Linux**
Acesse o terminal do Servidor Ubuntu, instale o pacote unzip (caso não tenha) e descompacte o arquivo no diretório temporário do seu usuário:

sudo apt install unzip -y
cd /mnt/NAS_Seguro
unzip frontend_dist.zip -d /tmp/

### 🌐 3.5 Configurando o Servidor Web SPA (Linux)

**Movendo os arquivos para a raiz web do Linux:**

sudo mkdir -p /var/www/painel_ti
sudo cp -r /tmp/dist/. /var/www/painel_ti/

**Criação e Execução do Servidor Web**
Crie o arquivo do Servidor Web focado em lidar com as rotas do React:

sudo nano /var/www/painel_ti/servidor_web.py

(Adicione o código Python de roteamento SPA dentro deste arquivo, salve e execute o script para colocar o site no ar).

### 📟 4. Configuração dos Dispositivos IoT (ESP32)

Para cada módulo ESP32 (Sensor de Temperatura e Botão), certifique-se de configurar a rede de forma estática no código-fonte em MicroPython/C++ antes do deploy:

# Exemplo de configuração de rede no código do ESP32
WIFI_SSID = "Sua_Rede_Wi-Fi"
WIFI_SENHA = "Sua_Senha" 

# Definir IP Estático conforme topologia
MEU_IP = '192.168.1.20' # .20 para Sensor Térmico, .21 para Botão
MASCARA = '255.255.255.0'
GATEWAY = '192.168.1.1'
DNS = '8.8.8.8'

estacao.ifconfig((MEU_IP, MASCARA, GATEWAY, DNS))
estacao.connect(WIFI_SSID, WIFI_SENHA)


🔑 5. Como Acessar o Sistema

Após todos os serviços estarem iniciados, os acessos seguem o seguinte padrão:

🛠️ Painel de Suporte (Técnicos): http://192.168.1.50 (Login obrigatório) # user: admin | senha: admin123

👨‍🏫 Portal do Docente (Abertura de Chamados): http://192.168.1.50/professor (Login obrigatório) # cadastro via painel de suporte da TI

📁 Servidor de Arquivos (NAS): \\192.168.1.50 # user: tecnico_TI | senha: Admin123

(Acesso pelo Windows. Apenas computadores e celulares da TI com IPs .10 e .11 conseguem visualizar a porta, mediante usuário/senha).
