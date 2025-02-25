document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Page Loaded: DOMContentLoaded event fired");

    const menuToggle = document.getElementById('menu-toggle');
    const checkboxContainer = document.getElementById('checkbox-container');
    const filterBranchDiv = document.getElementById('filter-branch');

    console.log("🔎 Fetching Field Technicians from Airtable...");
    await fetchFieldTechs(); // Fetch technicians from Airtable
    console.log("✅ Field Technicians Loaded.");

    attachCheckboxListeners(); // Attach event listeners to checkboxes
    loadFiltersFromLocalStorage(); // Load saved filters, default to 'All'

    observeTableData('#airtable-data tbody');
    observeTableData('#feild-data tbody');

    let checkboxesAppended = false;

    menuToggle.addEventListener('click', () => {
        console.log("📂 Menu Toggle Clicked");

        if (!checkboxesAppended) {
            console.log("🆕 Appending checkboxes...");
            generateCheckboxes(getFieldTechsFromTable());
            checkboxesAppended = true;
        }

        checkboxContainer.classList.toggle('show');
        console.log(`📂 Menu Status: ${checkboxContainer.classList.contains('show') ? "Opened" : "Closed"}`);
    });

    document.addEventListener('click', (event) => {
        if (!checkboxContainer.contains(event.target) && !menuToggle.contains(event.target)) {
            checkboxContainer.classList.remove('show');
            console.log("❌ Menu Closed due to outside click");
        }
    });
});

// ✅ Function to observe when table rows are added
function observeTableData(selector) {
    const targetNode = document.querySelector(selector);

    if (!targetNode) {
        console.warn(`⚠️ Table body (${selector}) not found. Retrying in 500ms...`);
        setTimeout(() => observeTableData(selector), 500);
        return;
    }

    console.log(`👀 Observing ${selector} for changes...`);

    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                filterRows();
                observer.disconnect(); // Stop observing once data is loaded
            }
        }
    });

    observer.observe(targetNode, { childList: true });
}


// ✅ Generate Checkboxes only when menu is clicked
async function generateCheckboxes(fieldTechs) {
    const filterBranchDiv = document.getElementById('filter-branch');
    filterBranchDiv.innerHTML = ''; // Clear existing checkboxes

    const checkboxContainer = document.createElement('div');
    checkboxContainer.classList.add('checkbox-row');

    // Add 'All' checkbox
    const allCheckbox = document.createElement('label');
    allCheckbox.innerHTML = `
        <input type="checkbox" name="branch" value="All" checked>
        <span>All</span>
    `;
    checkboxContainer.appendChild(allCheckbox);

    fieldTechs.forEach(name => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" name="branch" value="${name}">
            <span>${name}</span>
        `;
        checkboxContainer.appendChild(label);
    });

    filterBranchDiv.appendChild(checkboxContainer);
    console.log("✅ Checkboxes Added to DOM.");
    attachCheckboxListeners(); // Attach event listeners
}

// ✅ Ensure fetchFieldTechs is defined
async function fetchFieldTechs() {
    console.log("🔄 Fetching Field Techs...");
    const AIRTABLE_API_KEY = window.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = window.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = window.env.AIRTABLE_TABLE_NAME;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        });

        if (!response.ok) throw new Error(`❌ Error fetching data: ${response.statusText}`);

        const data = await response.json();
        console.log("✅ Data Received from Airtable:", data);

        const fieldTechsFromAirtable = new Set();

        data.records.forEach(record => {
            const fieldTech = record.fields['field tech'];
            if (fieldTech) {
                if (Array.isArray(fieldTech)) {
                    fieldTech.forEach(name => fieldTechsFromAirtable.add(name.trim()));
                } else {
                    fieldTech.split(',').forEach(name => fieldTechsFromAirtable.add(name.trim()));
                }
            }
        });

        generateCheckboxes(fieldTechsFromAirtable);

    } catch (error) {
        console.error('❌ Error fetching field techs:', error);
    }
}

function filterRows() {
    const selectedBranches = Array.from(document.querySelectorAll('#filter-branch input[name="branch"]:checked'))
        .map(checkbox => checkbox.value.toLowerCase().trim());

    if (selectedBranches.length === 0 || selectedBranches.includes("all")) {
        console.log("🌍 'All' selected, displaying all rows.");
        document.querySelectorAll('#airtable-data tbody tr, #feild-data tbody tr').forEach(row => {
            row.style.display = ""; // Show all rows
        });
        return;
    }

    const tables = [
        { table: document.querySelector('#airtable-data tbody'), h2: document.querySelector('#main-content h2') },
        { table: document.querySelector('#feild-data tbody'), h2: document.querySelector('#secoundary-content h2') }
    ];

    tables.forEach(({ table, h2 }) => {
        if (!table) return;

        const tableRows = table.querySelectorAll('tr');
        if (tableRows.length === 0) {
            console.warn("⚠️ No rows found to filter yet. Retrying in 500ms...");
            setTimeout(filterRows, 500); // Wait and retry
            return;
        }

        let visibleRows = 0;
        tableRows.forEach(row => {
            const fieldTechColumn = row.querySelector('td:nth-child(3)'); // Ensure this is the correct column index
            if (!fieldTechColumn) return;

            const fieldTech = fieldTechColumn.textContent.toLowerCase().trim();
            const isVisible = selectedBranches.some(branch => fieldTech.includes(branch));

            row.style.display = isVisible ? "" : "none";

            if (isVisible) visibleRows++;
        });

        // Hide <h2> and <th> if no visible rows
        if (visibleRows === 0) {
            h2.style.display = 'none';
            table.closest('table').querySelector('thead').style.display = 'none';
        } else {
            h2.style.display = '';
            table.closest('table').querySelector('thead').style.display = '';
        }
    });
}

// ✅ Function to extract Field Techs from the table dynamically
function getFieldTechsFromTable() {
    console.log("🔍 Extracting Field Techs from Table...");
    
    const tableRows1 = document.querySelectorAll('#airtable-data tbody tr');
    const tableRows2 = document.querySelectorAll('#feild-data tbody tr');
    const fieldTechsInTable = new Set();

    function extractFieldTechs(rows) {
        rows.forEach(row => {
            const fieldTechColumn = row.querySelector('td:nth-child(3)'); // Ensure this is the correct column
            if (fieldTechColumn && fieldTechColumn.textContent.trim() !== '') {
                fieldTechColumn.textContent
                    .split(',')
                    .map(name => name.trim()) // Trim whitespace
                    .filter(name => name !== '') // Remove empty values
                    .forEach(name => fieldTechsInTable.add(name));
            }
        });
    }

    extractFieldTechs(tableRows1);
    extractFieldTechs(tableRows2);

    const uniqueFieldTechs = Array.from(fieldTechsInTable).sort();
    console.log("✅ Unique Extracted Field Techs from Table:", uniqueFieldTechs);
    return uniqueFieldTechs;
}

function saveFiltersToLocalStorage() {
    const selectedFilters = Array.from(document.querySelectorAll('#filter-branch input[name="branch"]:checked'))
        .map(checkbox => checkbox.value);

    localStorage.setItem('selectedFilters', JSON.stringify(selectedFilters));
    console.log("💾 Filters saved:", selectedFilters);
}

function loadFiltersFromLocalStorage() {
    const storedFilters = localStorage.getItem('selectedFilters');

    if (storedFilters) {
        const selectedFilters = JSON.parse(storedFilters);
        console.log("🔄 Restoring Filters:", selectedFilters);

        // Check the corresponding checkboxes
        document.querySelectorAll('#filter-branch input[name="branch"]').forEach(checkbox => {
            checkbox.checked = selectedFilters.includes(checkbox.value);
        });

        // Delay filter execution to ensure table data is loaded
        setTimeout(() => filterRows(), 500);
    } else {
        // If no filters are stored, keep "All" checked
        document.querySelector('#filter-branch input[value="All"]').checked = true;
        console.log("🆕 No stored filters. Defaulting to 'All' checked.");
    }
}

function attachCheckboxListeners() {
    const checkboxes = document.querySelectorAll('#filter-branch input[name="branch"]');
    const allCheckbox = document.querySelector('#filter-branch input[value="All"]');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            console.log(`📌 Checkbox Changed: ${checkbox.value} - ${checkbox.checked ? "Checked" : "Unchecked"}`);

            if (checkbox.value === "All" && checkbox.checked) {
                // ✅ If "All" is checked, uncheck all other checkboxes
                checkboxes.forEach(cb => {
                    if (cb !== allCheckbox) {
                        cb.checked = false;
                    }
                });
            } else if (checkbox !== allCheckbox) {
                // ✅ If any individual checkbox is checked, uncheck "All"
                allCheckbox.checked = false;
            }

            saveFiltersToLocalStorage();
            filterRows(); // Apply the filter immediately
        });
    });

    console.log("✅ Checkbox Event Listeners Attached.");
}
