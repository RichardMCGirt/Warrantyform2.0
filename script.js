document.addEventListener('DOMContentLoaded', async function () {
    const airtableApiKey = window.env.AIRTABLE_API_KEY;
    const airtableBaseId = window.env.AIRTABLE_BASE_ID;
    const airtableTableName = window.env.AIRTABLE_TABLE_NAME;
   
// Run fetch functions concurrently
Promise.all([
    fetchAirtableFields(),
]).then(() => {
}).catch(error => {
    console.error("An error occurred during one of the fetch operations:", error);
});

    const mainContent = document.getElementById('main-content');
    const secondaryContent = document.getElementById('secoundary-content');
       
document.addEventListener("DOMContentLoaded", function () {
    function hideColumnsExcept(tableId, columnIndex) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const headers = table.querySelectorAll("th");
        const rows = table.querySelectorAll("tr");

        headers.forEach((th, index) => {
            if (index !== columnIndex) {
                th.style.display = "none";
            } else {
                th.style.display = "table-cell";
            }
        });

        rows.forEach(row => {
            row.querySelectorAll("td").forEach((td, index) => {
                if (index !== columnIndex) {
                    td.style.display = "none";
                } else {
                    td.style.display = "table-cell";
                }
            });
        });
    }

    // Wait for data to be populated before applying column hiding
    setTimeout(() => {
        hideColumnsExcept("airtable-data", 3); // 4th column (0-based index)
        hideColumnsExcept("feild-data", 3);
    }, 1000); // Adjust timeout based on data load speed
});

    async function fetchAirtableFields() {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?maxRecords=1`;
    
        console.log("Starting to fetch Airtable fields...");
        console.log("Request URL:", url);
    
        // Avoid logging sensitive information in production
        if (process.env.NODE_ENV === 'development') {
            console.log("API Key (Development only):", airtableApiKey);
        }
    
        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${airtableApiKey}`,
                },
            });
    
            console.log("Response received. Status:", response.status);
    
            // Check if the response was successful
            if (!response.ok) {
                const errorDetails = await response.text();
                throw new Error(`Failed to fetch fields. Status: ${response.status}, Status Text: ${response.statusText}, Details: ${errorDetails}`);
            }
    
            const data = await response.json();
    
            // Check if records exist and log the fields
            const fields = data.records?.[0]?.fields;
            if (fields) {
                console.log("Fetched Fields Data:", fields);
            } else {
                console.warn("No fields found in the returned data.");
            }
    
            return fields || {}; // Return fields or an empty object if none found
        } catch (error) {
            console.error("Error occurred while fetching Airtable fields:", error);
            return {}; // Return an empty object in case of an error
        }
    }

    async function fetchData(offset = null) {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?${offset ? `offset=${offset}` : ''}`;
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                return { records: [] }; // Return an empty array on error
            }
    
            return await response.json();
        } catch (error) {
            console.error('Error fetching data from Airtable:', error);
            return { records: [] }; // Return an empty array if an error occurs
        }
    }
    
    function adjustTableWidth() {
        const mainContent = document.querySelector('#airtable-data tbody');
        const secondaryContent = document.querySelector('#feild-data tbody');
    
        const hasPrimaryRecords = mainContent && mainContent.children.length > 0;
        const hasSecondaryRecords = secondaryContent && secondaryContent.children.length > 0;
    
        if (hasPrimaryRecords && !hasSecondaryRecords) {
            document.body.classList.add('single-table-view');
            makeTableScrollable('#airtable-data');
        } else if (!hasPrimaryRecords && hasSecondaryRecords) {
            document.body.classList.add('single-table-view');
            makeTableScrollable('#feild-data');
        } else {
            document.body.classList.remove('single-table-view');
            if (mainContent) resetTableScroll('#airtable-data');
            if (secondaryContent) resetTableScroll('#feild-data');
        }
    }
    
    // Adjust the table height to fill the available space dynamically
    function makeTableScrollable(tableSelector) {
        const table = document.querySelector(tableSelector);
    
        if (!table || !table.parentElement) {
            console.warn(`Table or parent element not found for selector: ${tableSelector}`);
            return;
        }
    
        const nav = document.querySelector('nav');
        const header = document.querySelector('.header');
        const searchContainer = document.querySelector('.search-container');
    
        const headerHeight = 
            (nav ? nav.offsetHeight : 0) +
            (header ? header.offsetHeight : 0) +
            (searchContainer ? searchContainer.offsetHeight : 0) +
            50; // Add some padding
    
        table.parentElement.style.maxHeight = `calc(100vh - ${headerHeight}px)`;
        table.parentElement.style.overflowY = 'auto';
    }
    
    // Reset scrollability for tables when both are visible
    function resetTableScroll(tableSelector) {
        const table = document.querySelector(tableSelector);
        if (table) {
            table.parentElement.style.maxHeight = '';
            table.parentElement.style.overflowY = '';
        }
    }
    
    // Call `adjustTableWidth` after data is loaded or when the table visibility changes
    fetchAllData().then(adjustTableWidth);
    
    function syncTableWidths() {
        const mainTable = document.querySelector('#airtable-data');
        const secondaryTable = document.querySelector('#feild-data');
    
        // Check if either table has rows (records)
        const mainTableHasRecords = mainTable && mainTable.querySelector('tbody tr') !== null;
        const secondaryTableHasRecords = secondaryTable && secondaryTable.querySelector('tbody tr') !== null;
    
        // If only one table has records, set its width to 80%
        if (mainTableHasRecords && !secondaryTableHasRecords) {
            mainTable.style.width = '80%';
            secondaryTable.style.width = '0'; // Hide or reduce the other table
        } else if (secondaryTableHasRecords && !mainTableHasRecords) {
            secondaryTable.style.width = '80%';
            mainTable.style.width = '0'; // Hide or reduce the other table
        } else if (mainTableHasRecords && secondaryTableHasRecords) {
            // If both have records, synchronize their widths
            const mainTableWidth = mainTable.offsetWidth;
            secondaryTable.style.width = `${mainTableWidth}px`;
        }
    }
    
    async function fetchAllData() {
        mainContent.style.display = 'none';
        secondaryContent.style.display = 'none';
    
        let allRecords = [];
        let offset = null;
        originalValues = {};
    
        try {
            const [subOptionsData, fieldManagerMapData] = await Promise.all([
                fetchAirtableSubOptionsFromDifferentTable().catch(() => []),
                fetchFieldManagerNames().catch(() => ({}))
            ]);
    
            subOptions = subOptionsData || [];
            const fieldManagerMap = fieldManagerMapData || {};
    
            do {
                const data = await fetchData(offset);
                if (data?.records?.length) {
                    allRecords = [...allRecords, ...data.records];
    
                    data.records.forEach(record => {
                        originalValues[record.id] = { ...record.fields };
                    });
                } else {
                    console.error('⚠️ No records found or invalid data structure:', data);
                    break;
                }
                offset = data.offset;
            } while (offset);
    
            allRecords.forEach(record => {
                const managerId = record.fields['Field Manager Assigned']?.[0];
                record.displayFieldManager = managerId && fieldManagerMap[managerId] ? fieldManagerMap[managerId] : 'Unknown';
            });
    
            // Count records by status
            const fieldTechReviewNeededCount = allRecords.filter(record => record.fields['Status'] === 'Field Tech Review Needed').length;
            const scheduledAwaitingFieldCount = allRecords.filter(record => record.fields['Status'] === 'Scheduled- Awaiting Field').length;
            console.log(`📌 Field Tech Review Needed: ${fieldTechReviewNeededCount}`);
            console.log(`📌 Scheduled - Awaiting Field: ${scheduledAwaitingFieldCount}`);
    
            const [primaryRecords, secondaryRecords] = await Promise.all([
                filterAndSortRecords(allRecords, 'Field Tech Review Needed', false),
                filterAndSortRecords(allRecords, 'Scheduled- Awaiting Field', true)
            ]);
    
            await Promise.all([
                displayData(primaryRecords, '#airtable-data', false),
                displayData(secondaryRecords, '#feild-data', true)
            ]);
    
            setTimeout(() => {
                mergeTableCells("#airtable-data", 2);
                mergeTableCells("#feild-data", 2);
                adjustTableWidth();
                syncTableWidths();
            }, 300);
    
            mainContent.style.display = 'block';
            secondaryContent.style.display = 'block';
            setTimeout(() => {
                mainContent.style.opacity = '1';
                secondaryContent.style.opacity = '1';
            }, 10);
        } catch (error) {
            console.error("🚨 Error in fetchAllData:", {
                function: "fetchAllData",
                status: error.response ? error.response.status : "Unknown",
                statusText: error.response ? error.response.statusText : "Unknown",
                details: error.message || "No message available",
                stackTrace: error.stack || "No stack trace available"
            });
        }
    }
    
    async function filterAndSortRecords(records, status, isSecondary) {
        console.log(`🔍 Filtering records for status: ${status}`);
        console.log(`📌 Total records before filtering: ${records.length}`);
    
        const filteredRecords = records.filter(record => {
            const match = record.fields['Status'] === status;
            return match;
        });
        
    
        console.log(`✅ Found ${filteredRecords.length} records for status: ${status}`);
    
        // Ensure sorting only happens when 'displayFieldManager' exists
        const sortedRecords = filteredRecords.sort((a, b) => {
            const aField = a.displayFieldManager || "";
            const bField = b.displayFieldManager || "";
            return aField.localeCompare(bField);
        });
    
        console.log(`📌 Sorted ${sortedRecords.length} records for status: ${status}`);
    
        return sortedRecords;
    }
    

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("filter-branch").addEventListener("change", function () {
            applyFilters();
        });
    });
    
    function applyFilters() {
        const selectedTechs = Array.from(document.querySelectorAll(".filter-checkbox:checked"))
            .map(checkbox => checkbox.value);
    
        document.querySelectorAll("#airtable-data tbody tr, #feild-data tbody tr").forEach(row => {
            const techCell = row.cells[1]; // Assuming the "Field Tech" column is index 1
            if (techCell) {
                const tech = techCell.textContent.trim();
                row.style.display = selectedTechs.length === 0 || selectedTechs.includes(tech) ? "" : "none";
            }
        });
    }
       
    async function fetchFieldManagerNames() {
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/tblHdf9KskO1auw3l`; 
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) throw new Error(`Error fetching field manager names: ${response.statusText}`);
    
            const data = await response.json();
            const idMap = {};
    
            data.records.forEach(manager => {
                idMap[manager.id] = manager.fields['Full Name']; // Assuming the name field is "Name"
            });
    
            return idMap;
        } catch (error) {
            console.error("❌ Error fetching field manager names:", error);
            return {};
        }
    }
        
    // Resize observer to adjust the secondary table width when the main table resizes
    const mainTable = document.querySelector('#airtable-data');
    const resizeObserver = new ResizeObserver(() => {
        syncTableWidths();
    });

    if (mainTable) {
        resizeObserver.observe(mainTable); // Observe the main table for any size changes
    }

    // Fetch data and call syncTableWidths after DOM content is ready
    fetchAllData();

    async function fetchAirtableFields() {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`;
        let offset = null;
        let allRecords = [];
    
        try {
            do {
                let fetchUrl = url;
                if (offset) {
                    fetchUrl += `?offset=${offset}`;
                }
    
                const response = await fetch(fetchUrl, {
                    headers: { Authorization: `Bearer ${airtableApiKey}` }
                });
    
                if (!response.ok) throw new Error(`❌ Error fetching data: ${response.statusText}`);
    
                const data = await response.json();
    
                // ✅ Store fetched records
                allRecords = [...allRecords, ...data.records];
    
                // ✅ Update offset if more records exist
                offset = data.offset || null;
            } while (offset); // ✅ Keep fetching until there’s no offset left
    
            return allRecords;
    
        } catch (error) {
            console.error('❌ Error fetching fields from Airtable:', error);
            return [];
        }
    }
    

    async function fetchDataAndInitializeFilter() {
        await fetchAllData(); // Ensure this function populates the tables
        console.log("Data loaded from Airtable.");
    }
    
    // Call this function after DOMContentLoaded
    document.addEventListener('DOMContentLoaded', fetchDataAndInitializeFilter);
    
// Function to filter table rows based on selected branch
function filterRecords() {
    const dropdown = document.querySelector('#filter-dropdown');
    if (!dropdown) {
        console.error("Dropdown element not found");
        return;
    }

    const selectedBranch = dropdown.value;
    console.log(`Selected branch: "${selectedBranch}"`);

    const tables = ['#airtable-data', '#feild-data'];

    tables.forEach(tableSelector => {
        console.log(`Filtering table: ${tableSelector}`);
        const rows = document.querySelectorAll(`${tableSelector} tbody tr`);

        if (rows.length === 0) {
            console.warn(`No rows found in table: ${tableSelector}`);
            return;
        }

        rows.forEach((row, index) => {
            const branchCell = row.querySelector('td:first-child');
            if (branchCell) {
                const branch = branchCell.textContent.trim();
                console.log(`Row ${index + 1}: Branch = "${branch}"`);
                if (selectedBranch === '' || branch === selectedBranch) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            } else {
                console.warn(`Row ${index + 1}: Branch cell not found.`);
            }
        });
    });
}

// Attach event listener to dropdown
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.querySelector('#filter-dropdown');
    if (dropdown) {
        console.log("Dropdown found. Adding change event listener."); // Debug log
        dropdown.addEventListener('change', filterRecords); // Filter on dropdown change
    } else {
        console.error("Dropdown with ID #filter-dropdown not found.");
    }
});
  
    async function fetchAirtableSubOptionsFromDifferentTable() {
        let records = [];
        let offset = null;
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME2}`;
        
        do {
            const response = await fetch(`${url}?fields[]=Subcontractor%20Company%20Name&fields[]=Vanir%20Branch${offset ? `&offset=${offset}` : ''}`, {
                headers: {
                    Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`
                }
            });
    
            if (!response.ok) {
                break;
            }
    
            const data = await response.json();
            records = records.concat(data.records);  
            offset = data.offset;  
        } while (offset);
    
        const subOptions = Array.from(new Set(records.map(record => {
    
            return {
                name: record.fields['Subcontractor Company Name'] || 'Unnamed Subcontractor',
                vanirOffice: record.fields['Vanir Branch'] || 'Unknown Branch'            };
        }).filter(Boolean)));
        
        return subOptions;  
    }

    function mergeTableCells(tableSelector, columnIndex) {
        const table = document.querySelector(tableSelector);
        if (!table) {
            console.warn(`⚠️ Table not found: ${tableSelector}`);
            return;
        }
    
        const rows = table.querySelectorAll("tbody tr");
        if (rows.length === 0) {
            console.warn(`⚠️ No rows found in table: ${tableSelector}`);
            return;
        }
    
        let lastCell = null;
        let rowspanCount = 1;
    
    
        rows.forEach((row, index) => {
            const currentCell = row.cells[columnIndex];
    
            if (!currentCell) {
                console.warn(`⚠️ No cell found at column ${columnIndex} in row ${index + 1}`);
                return;
            }
    
    
            if (lastCell && lastCell.textContent.trim() === currentCell.textContent.trim()) {
                rowspanCount++;
                lastCell.rowSpan = rowspanCount;
                currentCell.style.display = "none"; // Hide duplicate cell
            } else {
                lastCell = currentCell;
                rowspanCount = 1; // Reset rowspan count
            }
        });
    
    }

    // Reapply row colors after merging
document.querySelectorAll("tbody tr").forEach((row, index) => {
    row.style.backgroundColor = index % 2 === 0 ? "#ffffff" : "#f8f8f8";
});

    
    // ✅ Ensure data is fully loaded before running merge
    async function waitForTableData(tableSelector, columnIndex) {
        
        let retries = 10; // Adjust based on load time
        let tableReady = false;
    
        while (retries > 0) {
            const table = document.querySelector(tableSelector);
            const rows = table ? table.querySelectorAll("tbody tr") : [];
    
            if (rows.length > 0) {
                tableReady = true;
                break;
            }
    
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            retries--;
        }
    
        if (tableReady) {
            mergeTableCells(tableSelector, columnIndex);
        } else {
            console.error(`❌ Table data failed to load for ${tableSelector}.`);
        }
    }
    
    // ✅ Call after fetching all data
    setTimeout(() => {
        waitForTableData("#airtable-data", 2); // Merge "Field Tech" column in airtable-data
        waitForTableData("#feild-data", 2);   // Merge "Field Tech" column in feild-data
    }, 1500);
    
    async function displayData(records, tableSelector, isSecondary = false) {
        const tableElement = document.querySelector(tableSelector); // Select the entire table
        const tableContainer = tableElement.closest('.scrollable-div'); // Find the table's container
        const tbody = tableElement.querySelector('tbody'); // Select the table body
        const thead = tableElement.querySelector('thead'); // Select the table header
        const h2Element = tableContainer.previousElementSibling; // Select the corresponding h2
    
        // Clear the table body
        tbody.innerHTML = '';
    
        // Hide the entire table, header, and h2 if there are no records
        if (records.length === 0) {
            h2Element.style.display = 'none';            // Hide the h2
            tableElement.style.display = 'none';         // Hide the table
            thead.style.display = 'none';                // Hide the header
            return;
        } else {
            h2Element.style.display = 'block';           // Show the h2 if records are present
            tableElement.style.display = 'table';        // Show the table
            thead.style.display = 'table-header-group';  // Show the header
            tableContainer.style.width = '100%';         // Ensure table auto-adjusts to content width
        }
        
        // Populate rows based on the provided configuration
        records.forEach(record => {
            const fields = record.fields;
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            row.appendChild(cell);
    
            const fieldConfigs = isSecondary ? [
                { field: 'b', value: fields['b'] || 'N/A', link: true },
                { field: 'field tech', value: fields['field tech'] || '', editable: false },
                { 
                    field: 'Lot Number and Community/Neighborhood', 
                    value: fields['Lot Number and Community/Neighborhood'] || 'N/A', 
                    jobDetailsLink: true  
                }
            ] : [
                { field: 'b', value: fields['b'] || 'N/A', link: true },
                { field: 'field tech', value: fields['field tech'] || '', editable: false },
                { 
                    field: 'Lot Number and Community/Neighborhood', 
                    value: fields['Lot Number and Community/Neighborhood'] || 'N/A', 
                    jobDetailsLink: true  
                }
            ];
    
            fieldConfigs.forEach(config => {
                const { field, value } = config;
                const cell = document.createElement('td');
                cell.dataset.id = record.id;
                cell.dataset.field = field;
                cell.style.wordWrap = 'break-word';
                cell.style.maxWidth = '200px';
                cell.style.position = 'relative';
    
                cell.textContent = value;
        
                row.appendChild(cell);
            });
    
            // Handle Job Details Link
            const jobCell = row.querySelector(`td[data-field="Lot Number and Community/Neighborhood"]`);
            const jobIdCell = row.querySelector('td[data-field="b"]');
    
            if (jobCell && jobIdCell) {
                const jobId = jobIdCell.getAttribute("data-id");
    
                if (jobId) {
                    localStorage.setItem("selectedJobId", jobId);
                    jobCell.style.cursor = 'pointer';
                    jobCell.style.color = 'blue';
                    jobCell.style.textDecoration = 'underline';
    
                    jobCell.addEventListener('click', () => {
                        console.log(`🔀 Redirecting NOW to job-details.html?id=${jobId}`);
                        window.location.href = `job-details.html?id=${jobId}`;
                    });
                }
            }
    
            tbody.appendChild(row);
        });
    }
    
  
    document.getElementById('search-input').addEventListener('input', function () {
        const searchValue = this.value.toLowerCase();

        ['#airtable-data', '#feild-data'].forEach(tableSelector => {
            const rows = document.querySelectorAll(`${tableSelector} tbody tr`);
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                const match = Array.from(cells).some(cell => cell.textContent.toLowerCase().includes(searchValue));
                row.style.display = match ? '' : 'none';
            });
        });
    });

    fetchAllData();
});