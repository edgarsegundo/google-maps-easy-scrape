// IndexedDB Setup
const DB_NAME = 'WhatsAppExtractorDB';
const DB_VERSION = 1;
const STORE_NAME = 'contacts';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('domain', 'domain', { unique: false });
        objectStore.createIndex('whatsapp', 'whatsapp', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Atualiza um contato pelo id
async function updateContact(id, updateObj) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
        const contact = getReq.result;
        if (!contact) return reject('Contato não encontrado');
        Object.assign(contact, updateObj);
        const putReq = store.put(contact);
        putReq.onsuccess = () => resolve(putReq.result);
        putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}


async function saveContact(contact) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(contact);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllContacts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLastContacts(limit = 10) {
  const contacts = await getAllContacts();
  return contacts.slice(-limit).reverse();
}

async function whatsappExists(whatsappNumber) {
  const contacts = await getAllContacts();
  return contacts.some(contact => contact.whatsapp === whatsappNumber);
}

async function clearDatabase() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function extractWhatsAppFromPage() {
  const content = document.body.innerText + ' ' + document.body.innerHTML;

  console.log('Extraindo WhatsApp (Brasil +55, bem formatado ou limpo)...');

  /**
   * Captura números brasileiros com 55, permitindo:
   * +55, espaços, parênteses e hífens
   * Garante que não exista dígito antes ou depois
   */
  const loosePattern =
    /(?<!\d)(?:\+?55[\s().-]*)\d{2}[\s().-]*9?\d{4}[\s().-]*\d{4}(?!\d)/g;

  const matches = content.match(loosePattern) || [];
  const whatsappNumbers = new Set();

  matches.forEach(match => {
    // Remove tudo que não é número
    const cleaned = match.replace(/\D/g, '');

    // Validação final e estrita
    if (
      cleaned.startsWith('55') &&
      cleaned.length >= 12 &&
      cleaned.length <= 13
    ) {
      whatsappNumbers.add(cleaned);
      console.log('WhatsApp encontrado:', cleaned);
    }
  });

  // Emails (inalterado)
  const emailPattern =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = content.match(emailPattern) || [];

  console.log('Total WhatsApp encontrados:', whatsappNumbers.size);

  return {
    whatsapp: [...whatsappNumbers],
    emails: [...new Set(emails)].slice(0, 3),
    domain: window.location.hostname
  };
}


// Update total count
async function updateTotalCount() {
  try {
    const contacts = await getAllContacts();
    console.log('Total de contatos no banco:', contacts.length);
    console.log('Contatos:', contacts);
    document.getElementById('totalCount').textContent = contacts.length;
  } catch (error) {
    console.error('Erro ao atualizar contador:', error);
    document.getElementById('totalCount').textContent = '?';
  }
}

// Display last records
async function displayLastRecords() {
  const lastRecords = await getLastContacts(10);
  const recordsList = document.getElementById('recordsList');
  
  if (lastRecords.length === 0) {
    recordsList.innerHTML = '<p class="text-gray-500 text-sm text-center">Nenhum registro ainda</p>';
    return;
  }
  
  recordsList.innerHTML = lastRecords.map(record => `
    <div class="border-b border-gray-200 py-2 last:border-b-0">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <p class="text-xs font-semibold text-gray-700">${record.domain}</p>
          <p class="text-sm text-green-600 font-mono">📱 ${record.whatsapp}</p>
          ${record.email ? `<p class="text-xs text-gray-500">📧 ${record.email}</p>` : ''}
        </div>
        <span class="text-xs text-gray-400">${new Date(record.timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

// Main event listeners
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('sendNextBtn').addEventListener('click', async () => {
      const contacts = await getAllContacts();
      // Busca o próximo não enviado
      const next = contacts.find(c => !c.sent);
      if (!next) {
        alert('Todos os números já foram enviados!');
        return;
      }
      // Marca como enviado
      await updateContact(next.id, { sent: true });
      // Abre WhatsApp Web sempre na mesma aba
      const url = `https://web.whatsapp.com/send?phone=${next.whatsapp}`;
      window.open(url, 'whatsappweb');
      await updateTotalCount();
    });
  await updateTotalCount();

  document.getElementById('resetDbBtn').addEventListener('click', async () => {
    const result = confirm('Tem certeza que deseja limpar o banco de dados? Esta ação não pode ser desfeita.');
    if (result) {
      try {
        await clearDatabase();
        await updateTotalCount();
      } catch (error) {
        console.error('Erro ao limpar banco de dados:', error);
        alert('Ocorreu um erro ao limpar o banco de dados.');
      }
    }
  });

  document.getElementById('extractBtn').addEventListener('click', async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0].id;
      
      try {
        console.log('Iniciando extração...');
        
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          function: extractWhatsAppFromPage
        });
        
        console.log('Resultados:', results);
        
        const data = results[0].result;
        
        console.log('Dados extraídos:', data);
        
        if (!data.whatsapp || data.whatsapp.length === 0) {
        //   Swal.fire({
        //     icon: 'warning',
        //     title: 'Nenhum WhatsApp encontrado',
        //     text: 'Não foi possível encontrar números de WhatsApp nesta página.',
        //     confirmButtonColor: '#16a34a'
        //   });
          return;
        }
        
        // Save each WhatsApp number (only if not exists)
        let savedCount = 0;
        let duplicateCount = 0;
        
        console.log('Verificando duplicatas e salvando...');
        
        for (const whatsapp of data.whatsapp) {
          const exists = await whatsappExists(whatsapp);
          console.log(`WhatsApp ${whatsapp} - Existe: ${exists}`);
          
          if (!exists) {
            const contact = {
              domain: data.domain,
              whatsapp: whatsapp,
              email: data.emails[0] || null,
              timestamp: Date.now()
            };
            
            try {
              await saveContact(contact);
              savedCount++;
              console.log(`WhatsApp ${whatsapp} salvo com sucesso!`);
            } catch (error) {
              console.error(`Erro ao salvar ${whatsapp}:`, error);
            }
          } else {
            duplicateCount++;
          }
        }
        
        console.log(`Salvos: ${savedCount}, Duplicados: ${duplicateCount}`);
        
        await updateTotalCount();
        
        // Update floating widget
        chrome.tabs.sendMessage(tabId, { 
          action: 'updateCount', 
          count: savedCount 
        }).catch(() => {}); // Ignore error if content script not ready
        
        // Show result message
        if (savedCount > 0) {
          let message = `${savedCount} número(s) de WhatsApp extraído(s) e salvos!`;
          if (duplicateCount > 0) {
            message += `\n${duplicateCount} já existia(m) no banco.`;
          }
          
        //   Swal.fire({
        //     icon: 'success',
        //     title: 'Sucesso!',
        //     text: message,
        //     confirmButtonColor: '#16a34a'
        //   });
        } else if (duplicateCount > 0) {
        //   Swal.fire({
        //     icon: 'info',
        //     title: 'Já existe!',
        //     text: `${duplicateCount} número(s) já estava(m) no banco de dados.`,
        //     confirmButtonColor: '#3b82f6'
        //   });
        }
        
      } catch (error) {
        console.error('Erro:', error);
        // Swal.fire({
        //   icon: 'error',
        //   title: 'Erro',
        //   text: 'Ocorreu um erro ao extrair os dados.',
        //   confirmButtonColor: '#dc2626'
        // });
      }
    });
  });
  
  document.getElementById('viewLastBtn').addEventListener('click', async () => {
    const lastRecordsDiv = document.getElementById('lastRecords');
    lastRecordsDiv.classList.toggle('hidden');
    
    if (!lastRecordsDiv.classList.contains('hidden')) {
      await displayLastRecords();
    }
  });
});