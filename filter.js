document.addEventListener('DOMContentLoaded', async () => {

    await fetchFieldTechs(); // ✅ Ensure this completes before proceeding

    attachCheckboxListeners();
    observeTableData('#airtable-data tbody');
    observeTableData('#feild-data tbody');

    const menuToggle = document.getElementById('menu-toggle');
    const checkboxContainer = document.getElementById('checkbox-container');

    let checkboxesAppended = false;

    menuToggle.addEventListener('click', () => {
        if (!checkboxesAppended) {
            generateCheckboxes(getFieldTechsFromTable());
            checkboxesAppended = true;
        }
        checkboxContainer.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!checkboxContainer.contains(event.target) && !menuToggle.contains(event.target)) {
            checkboxContainer.classList.remove('show');
        }
    });

    // ✅ Ensure filtering only happens after everything is ready
});


// ✅ Function to observe when table rows are added
function observeTableData(selector) {
    const targetNode = document.querySelector(selector);

    if (!targetNode) {
        console.warn(`⚠️ Table body (${selector}) not found. Retrying in 500ms...`);
        setTimeout(() => observeTableData(selector), 500);
        return;
    }


    const observer = new MutationObserver((mutationsList, observer) => {
        let rowsAdded = false;
        for (const mutation of mutationsList) {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                filterRows();
                rowsAdded = true;
                observer.disconnect(); // Stop observing once data is loaded
            }
        }

        if (!rowsAdded) {
        }
    });

    observer.observe(targetNode, { childList: true });
}



// ✅ Generate Checkboxes only when menu is clicked
async function generateCheckboxes(fieldTechs) {
    const filterBranchDiv = document.getElementById('filter-branch');

    // ✅ Prevent duplicate checkbox generation
    if (filterBranchDiv.children.length > 0) {
        console.warn("⚠️ Checkboxes already exist. Skipping generation.");
        return;
    }

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
    
    attachCheckboxListeners();
}


// ✅ Ensure fetchFieldTechs is defined
async function fetchFieldTechs() {
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
    return uniqueFieldTechs;
}

// ✅ Save selected checkboxes to `localStorage`
function saveFiltersToLocalStorage() {
    const selectedFilters = Array.from(document.querySelectorAll('#filter-branch input[name="branch"]:checked'))
        .map(checkbox => checkbox.value);

    localStorage.setItem('selectedFilters', JSON.stringify(selectedFilters));
}

// ✅ Load selected checkboxes from `localStorage`
function loadFiltersFromLocalStorage() {
    const storedFilters = localStorage.getItem('selectedFilters');

    if (storedFilters) {
        const selectedFilters = JSON.parse(storedFilters);

        waitForElements(() => {
            console.log("🔄 Applying filters...");
            document.querySelectorAll('#filter-branch input[name="branch"]').forEach(checkbox => {
                checkbox.checked = selectedFilters.includes(checkbox.value);
            });

            filterRows(); // ✅ Apply filters

            
        });
    } else {
        document.querySelector('#filter-branch input[value="All"]').checked = true;
    }
}
// ✅ Function to ensure table data is loaded before filtering
function waitForTableData(callback) {
    const tableCheckInterval = setInterval(() => {
        const tableRows = document.querySelectorAll('#airtable-data tbody tr, #feild-data tbody tr');
        if (tableRows.length > 0) {
            clearInterval(tableCheckInterval);
            callback(); // ✅ Apply filtering once data is available
        }
    }, 300); // Check every 300ms until table has rows
}

// ✅ Log manual clicks on the filter button
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            console.log(`📂 [USER CLICK] Filter menu ${menuToggle.classList.contains('show') ? "CLOSED" : "OPENED"}`);
        });
    }
});


function handleCheckboxChange(event) {
    const checkbox = event.target;
    console.log(`📌 Checkbox Changed: ${checkbox.value} - ${checkbox.checked ? "Checked" : "Unchecked"}`);

    const checkboxes = document.querySelectorAll('#filter-branch input[name="branch"]');
    const allCheckbox = document.querySelector('#filter-branch input[value="All"]');

    if (checkbox.value === "All" && checkbox.checked) {
        checkboxes.forEach(cb => {
            if (cb !== allCheckbox) cb.checked = false;
        });
    } else if (checkbox !== allCheckbox) {
        allCheckbox.checked = false;
    }

    saveFiltersToLocalStorage();
    filterRows();
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
                    if (cb !== allCheckbox) cb.checked = false;
                });
            } else if (checkbox !== allCheckbox) {
                // ✅ If any other checkbox is checked, uncheck "All"
                allCheckbox.checked = false;
            }

            saveFiltersToLocalStorage();
            filterRows();
        });
    });

}