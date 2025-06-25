// Elementos principais
const mainSection = document.getElementById("mainSection");
const resultsDiv = document.getElementById("results");
const clientDetailsCard = document.getElementById("clientDetailsCard");

// Elementos da Busca
const searchForm = document.getElementById("searchForm");
const searchTermInput = document.getElementById("searchTerm");
const searchTypeSelect = document.getElementById("searchType");

// Elementos da Listagem de Clientes
const showListBtn = document.getElementById("showListBtn");
const clientListContainer = document.getElementById("clientListContainer");
const clientListUl = document.getElementById("clientList");
const backToListMainBtn = document.getElementById("backToListMainBtn");

// Elementos do Formulário de Adição de Cliente
const showAddFormBtn = document.getElementById("showAddFormBtn");
const addClientFormContainer = document.getElementById(
  "addClientFormContainer"
);
const addClientForm = document.getElementById("addClientForm");
const addClientMessageDiv = document.getElementById("addClientMessage");
const backToAddMainBtn = document.getElementById("backToAddMainBtn");

let allClientsData = []; // Armazena todos os clientes para exibição de detalhes

// --- Funções de Controle de Visibilidade ---
function showSection(sectionToShow) {
  // Esconde todas as seções (exceto o container principal)
  mainSection.style.display = "none";
  clientListContainer.style.display = "none";
  addClientFormContainer.style.display = "none";
  clientDetailsCard.style.display = "none";
  resultsDiv.innerHTML = "";

  // Mostra a seção desejada
  sectionToShow.style.display = "block";
}

// Função para exibir os resultados da busca
async function performSearch(term, type) {
  resultsDiv.innerHTML = "";
  clientDetailsCard.style.display = "none";

  try {
    const response = await fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `searchTerm=${encodeURIComponent(
        term
      )}&searchType=${encodeURIComponent(type)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status} - ${
          errorData.error || response.statusText
        }`
      );
    }

    const clients = await response.json();
    displayClients(clients, resultsDiv);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    // resultsDiv.innerHTML = `<p class="no-results error">Ocorreu um erro ao buscar os clientes: ${error.message}. Tente novamente.</p>`;
  }
}

// Função para exibir detalhes de um cliente em um card
function displayClientDetails(client) {
  const detailsContentDiv = document.getElementById("detailsContent");
  detailsContentDiv.innerHTML = "";
  let clientInfo = `
        <p><strong>Nome:</strong> ${client.nome || "N/A"}</p>
        ${client.cpf ? `<p><strong>CPF:</strong> ${client.cpf}</p>` : ""}
        ${client.cnpj ? `<p><strong>CNPJ:</strong> ${client.cnpj}</p>` : ""}
        ${client.email ? `<p><strong>Email:</strong> ${client.email}</p>` : ""}
        ${
          client.telefone
            ? `<p><strong>Telefone:</strong> ${client.telefone}</p>`
            : ""
        }
        ${client.rg ? `<p><strong>RG:</strong> ${client.rg}</p>` : ""}
        ${
          client.data_emissao_rg
            ? `<p><strong>Data Emissão RG:</strong> ${client.data_emissao_rg}</p>`
            : ""
        }
    `;
  detailsContentDiv.innerHTML = clientInfo;
  clientDetailsCard.style.display = "block";
}

// Função auxiliar para renderizar clientes em um div específico (usado na busca)
function displayClients(clients, targetDiv) {
  targetDiv.innerHTML = "";
  if (clients.length === 0) {
    targetDiv.innerHTML =
      '<p class="no-results">Nenhum cliente encontrado com este critério.</p>';
  } else {
    clients.forEach((client) => {
      const card = document.createElement("div");
      card.classList.add("client-card");
      let clientInfo = `<p><strong>Nome:</strong> ${client.nome || "N/A"}</p>`;
      if (client.cpf)
        clientInfo += `<p><strong>CPF:</strong> ${client.cpf}</p>`;
      if (client.cnpj)
        clientInfo += `<p><strong>CNPJ:</strong> ${client.cnpj}</p>`;
      if (client.email)
        clientInfo += `<p><strong>Email:</strong> ${client.email}</p>`;
      if (client.telefone)
        clientInfo += `<p><strong>Telefone:</strong> ${client.telefone}</p>`;
      if (client.rg) clientInfo += `<p><strong>RG:</strong> ${client.rg}</p>`;
      if (client.data_emissao_rg)
        clientInfo += `<p><strong>Data Emissão RG:</strong> ${client.data_emissao_rg}</p>`;
      card.innerHTML = clientInfo;
      targetDiv.appendChild(card);
    });
  }
}

// Event listener para o formulário de busca
searchForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  const searchTerm = searchTermInput.value;
  const searchType = searchTypeSelect.value;
  await performSearch(searchTerm, searchType);
});

// --- Event Listeners para os novos botões ---

// Botão "Listar Todos os Clientes"
showListBtn.addEventListener("click", async function () {
  showSection(clientListContainer);
  clientListUl.innerHTML = "";
  clientDetailsCard.style.display = "none"; // Esconde detalhes ao abrir a lista

  try {
    const response = await fetch("/list_all_clients");

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status} - ${
          errorData.error || response.statusText
        }`
      );
    }

    const clients = await response.json();
    allClientsData = clients; // Armazena os dados para uso posterior

    if (clients.length === 0) {
      clientListUl.innerHTML =
        '<li class="no-results">Nenhum cliente cadastrado.</li>';
    } else {
      clients.forEach((client, index) => {
        const listItem = document.createElement("li");

        const nameSpan = document.createElement("span");
        nameSpan.textContent = client.nome || "Nome Indisponível";
        nameSpan.style.flexGrow = "1";
        nameSpan.style.cursor = "pointer";

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-btn");
        deleteButton.textContent = "Excluir";
        deleteButton.dataset.clientId = client.id;

        deleteButton.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (
            confirm(
              `Tem certeza que deseja excluir o cliente "${client.nome}"?`
            )
          ) {
            await deleteClient(client.id);
            showListBtn.click();
          }
        });

        listItem.dataset.index = index; // Armazena o índice do cliente na lista
        listItem.addEventListener("click", function () {
          document.querySelectorAll("#clientList li").forEach((item) => {
            item.classList.remove("selected");
          });
          this.classList.add("selected");
          displayClientDetails(allClientsData[this.dataset.index]);
        });
        listItem.appendChild(nameSpan);
        listItem.appendChild(deleteButton);
        clientListUl.appendChild(listItem);
      });
    }
  } catch (error) {
    console.error("Erro ao listar todos os clientes:", error);
    clientListUl.innerHTML = `<li class="no-results error">Erro ao carregar a lista de clientes: ${error.message}.</li>`;
  }
});

// --- Função para Excluir Cliente ---
async function deleteClient(clientId) {
  try {
    const response = await fetch(`/delete_client/${clientId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok) {
      showMessage(resultsDiv, result.message, "success");
    } else {
      showMessage(
        resultsDiv,
        `Erro ao excluir: ${result.error || "Falha na exclusão."}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Erro de rede ao excluir cliente:", error);
    showMessage(
      resultsDiv,
      `Erro na conexão ao excluir: ${error.message}.`,
      "error"
    );
  }
}

// Botão Adicionar Novo Cliente
showAddFormBtn.addEventListener("click", function () {
  showSection(addClientFormContainer);
  addClientForm.reset(); // Limpa o formulário caso já tenha sido preenchido
  addClientMessageDiv.style.display = "none";
});

// Botão "Voltar" da lista de clientes
backToListMainBtn.addEventListener("click", function () {
  showSection(mainSection);
});

// Botão "Voltar" do formulário de adicionar cliente
backToAddMainBtn.addEventListener("click", function () {
  showSection(mainSection);
});

// --- ADICIONAR NOVO CLIENTE ---
addClientForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const formData = new FormData(addClientForm);
  const clientData = {};
  for (let [key, value] of formData.entries()) {
    clientData[key] = value === "" ? null : value;
  }

  if (!clientData.nome || clientData.nome.trim().length < 2) {
    showMessage(
      addClientMessageDiv,
      "O nome é obrigatório e deve ter pelo menos duas palavras.",
      "error"
    );
    return;
  }

  try {
    const response = await fetch("/add_client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clientData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage(addClientMessageDiv, result.message, "success");
      addClientForm.reset();
    } else {
      showMessage(
        addClientMessageDiv,
        `Erro: ${result.error || "Falha ao adicionar cliente."}`,
        "error"
      );
    }
  } catch (error) {
    console.error("Erro ao adicionar cliente:", error);
    showMessage(
      addClientMessageDiv,
      `Erro na conexão: ${error.message}.`,
      "error"
    );
  }
});

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = "block";
  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

// Inicializa a interface mostrando apenas a seção principal
document.addEventListener("DOMContentLoaded", () => {
  showSection(mainSection);
});
