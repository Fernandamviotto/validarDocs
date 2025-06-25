import re
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client # Importar Supabase

app = Flask(__name__)

# --- Site para gerar CPF ficticio porem validos (https://www.4devs.com.br/gerador_de_cpf)---

# --- Configuração do Supabase ---
SUPABASE_URL = "https://nenwncugjhspekbrkrdz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbnduY3VnamhzcGVrYnJrcmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTE3NDcsImV4cCI6MjA2NjM2Nzc0N30.ASyS18qx7MnpzsvNpYRQMfCG3Ohx5lMimP85TjXDdhc" # sua anon public key

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Validações
class ValidadorDocumentos:
    @staticmethod
    def validar_cpf(cpf):
        # Validar um CPF
        cpf = re.sub(r'[^0-9]', '', str(cpf or ''))
        if len(cpf) != 11 or cpf == cpf[0] * 11:
            return False
        soma = 0
        for i in range(9):
            soma += int(cpf[i]) * (10 - i)
        resto = 11 - (soma % 11)
        digito1 = resto if resto < 10 else 0
        soma = 0
        for i in range(10):
            soma += int(cpf[i]) * (11 - i)
        resto = 11 - (soma % 11)
        digito2 = resto if resto < 10 else 0
        return int(cpf[9]) == digito1 and int(cpf[10]) == digito2

    @staticmethod
    def validar_cnpj(cnpj):
        # Valida um CNPJ brasileiro
        cnpj = re.sub(r'[^0-9]', '', cnpj)
        if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
            return False
        peso = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = 0
        for i in range(12):
            soma += int(cnpj[i]) * peso[i]
        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto
        peso = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = 0
        for i in range(13):
            soma += int(cnpj[i]) * peso[i]
        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto
        return int(cnpj[12]) == digito1 and int(cnpj[13]) == digito2

    @staticmethod
    def validar_data_emissao(data_str):
        # Valida se a data de emissão é válida e não é futura
        try:
            data_emissao = datetime.strptime(data_str, '%d/%m/%Y')
            if data_emissao > datetime.now():
                return False
            return True
        except ValueError:
            return False

    @staticmethod
    def validar_rg(rg):
        # Valida o RG
        rg = re.sub(r'\D', '', rg)
        if len(rg) not in (8, 9):
            return False
        if rg == rg[0] * len(rg):
            return False
        return True

    @staticmethod
    def validar_telefone(telefone):
        # Valida telefone (aceita formatos comuns)
        telefone = re.sub(r'\D', '', telefone)
        return 10 <= len(telefone) <= 11

    @staticmethod
    def validar_email(email):
        # Valida e-mail
        regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(regex, email) is not None

    @staticmethod
    def validar_nome(nome):
        # Valida nome
        nome = nome.strip()
        if len(nome.split()) < 2:
            return False
        return re.fullmatch(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$", nome) is not None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search_client():
    search_term = (request.form.get('searchTerm') or '').strip().lower()
    search_type = (request.form.get('searchType') or '').strip().lower()


    if search_type in ['cpf', 'cnpj', 'rg', 'telefone']:
        search_term = re.sub(r'\D', '', search_term)
    try:
        response = supabase.table('clientes').select('*').execute()
        clientes_do_banco = response.data 
    except Exception as e:
        print(f"Erro ao buscar clientes no Supabase: {e}")
        return jsonify({"error": "Erro ao buscar dados do banco de dados"}), 500

    results = []

    for client in clientes_do_banco:
        is_valid = False

        if search_type == 'nome' and ValidadorDocumentos.validar_nome(client.get('nome', '')):
            if search_term in client.get('nome', '').lower():
                is_valid = True
        elif search_type == 'cpf' and ValidadorDocumentos.validar_cpf(client.get('cpf', '')):
            stored_cpf = re.sub(r'\D', '', str(client.get('cpf') or ''))
            if search_term == stored_cpf:
                is_valid = True
        elif search_type == 'cnpj' and ValidadorDocumentos.validar_cnpj(client.get('cnpj', '')):
            stored_cnpj = re.sub(r'\D', '', client.get('cnpj', ''))
            if search_term == stored_cnpj:
                is_valid = True
        elif search_type == 'email' and ValidadorDocumentos.validar_email(client.get('email', '')):
            if search_term in client.get('email', '').lower():
                is_valid = True
        elif search_type == 'telefone' and ValidadorDocumentos.validar_telefone(client.get('telefone', '')):
            stored_telefone = re.sub(r'\D', '', client.get('telefone', ''))
            if search_term == stored_telefone:
                is_valid = True
        elif search_type == 'rg' and ValidadorDocumentos.validar_rg(client.get('rg', '')):
            stored_rg = re.sub(r'\D', '', client.get('rg', ''))
            if search_term == stored_rg:
                is_valid = True

        if is_valid:
            results.append(client)

    return jsonify(results)

@app.route('/list_all_clients', methods=['GET'])
def list_all_clients():
    try:
        # Consulta todos os clientes no Supabase
        response = supabase.table('clientes').select('*').execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Erro ao listar todos os clientes do Supabase: {e}")
        return jsonify({"error": "Erro ao listar clientes"}), 500

# --- NOVA ROTA PARA ADICIONAR CLIENTES ---
@app.route('/add_client', methods=['POST'])
def add_client():
    client_data = request.json # Recebe os dados como JSON

    # Realiza as validações dos dados recebidos
    if not ValidadorDocumentos.validar_nome(client_data.get('nome', '')):
        return jsonify({"error": "Nome inválido."}), 400
    if client_data.get('email') and not ValidadorDocumentos.validar_email(client_data.get('email', '')):
        return jsonify({"error": "Email inválido."}), 400
    if client_data.get('telefone') and not ValidadorDocumentos.validar_telefone(client_data.get('telefone', '')):
        return jsonify({"error": "Telefone inválido."}), 400
    if client_data.get('cpf') and not ValidadorDocumentos.validar_cpf(client_data.get('cpf', '')):
        return jsonify({"error": "CPF inválido."}), 400
    if client_data.get('cnpj') and not ValidadorDocumentos.validar_cnpj(client_data.get('cnpj', '')):
        return jsonify({"error": "CNPJ inválido."}), 400
    if client_data.get('rg') and not ValidadorDocumentos.validar_rg(client_data.get('rg', '')):
        return jsonify({"error": "RG inválido."}), 400
    if client_data.get('data_emissao_rg') and not ValidadorDocumentos.validar_data_emissao(client_data.get('data_emissao_rg', '')):
        return jsonify({"error": "Data de emissão do RG inválida ou futura."}), 400


    client_to_insert = {
        "nome": client_data.get('nome'),
        "cpf": client_data.get('cpf') or None,
        "cnpj": client_data.get('cnpj') or None,
        "email": client_data.get('email'),
        "telefone": client_data.get('telefone'),
        "rg": client_data.get('rg') or None,
        "data_emissao_rg": client_data.get('data_emissao_rg') or None,
    }

    try:
        # Insere o novo cliente no Supabase
        response = supabase.table('clientes').insert(client_to_insert).execute()
        # Verificar se a inserção foi bem-sucedida
        if response.data:
            return jsonify({"message": "Cliente adicionado com sucesso!", "client": response.data[0]}), 201
        else:
            return jsonify({"error": "Falha ao adicionar cliente: Nenhuma resposta do banco de dados."}), 500
    except Exception as e:
        print(f"Erro ao adicionar cliente ao Supabase: {e}")
        return jsonify({"error": f"Erro interno ao adicionar cliente: {e}"}), 500


@app.route('/delete_client/<string:client_id>', methods=['DELETE'])
def delete_client(client_id):
    try:
        # Busca o cliente pelo ID para confirmar se existe antes de excluir (opcional, mas boa prática)
        response = supabase.table('clientes').select('id').eq('id', client_id).execute()
        if not response.data:
            return jsonify({"error": "Cliente não encontrado."}), 404

        # Exclui o cliente do Supabase usando o ID
        delete_response = supabase.table('clientes').delete().eq('id', client_id).execute()

        if delete_response.data: # Supabase retorna os dados do item excluído em .data
            return jsonify({"message": "Cliente excluído com sucesso!", "client_id": client_id}), 200
        else:
            # Caso a resposta não contenha dados, mas não tenha dado erro explícito
            return jsonify({"error": "Falha ao excluir cliente: Nenhuma resposta do banco de dados após exclusão."}), 500
    except Exception as e:
        print(f"Erro ao excluir cliente do Supabase: {e}")
        return jsonify({"error": f"Erro interno ao excluir cliente: {e}"}), 500

if __name__ == '__main__':
    app.run(debug=True)   