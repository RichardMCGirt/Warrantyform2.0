document.addEventListener('DOMContentLoaded', async function () {
    const airtableApiKey = window.env.AIRTABLE_API_KEY;
    const airtableBaseId = window.env.AIRTABLE_BASE_ID;
    const airtableTableName = window.env.AIRTABLE_TABLE_NAME;
    const billableOptions = ['Billable', 'Non Billable'];
    const reasonOptions = ['Another Trade Damaged Work', 'Homeowner Damage', 'Weather'];
    const homeownerbuilderOptions =['Homeowner','Builder', 'Subcontractor ']

  

    const calendarLinks = await fetchCalendarLinks();
  

// Run fetch functions concurrently
Promise.all([
    fetchAirtableFields(),
]).then(() => {
}).catch(error => {
    console.error("An error occurred during one of the fetch operations:", error);
});

                   
    const mainContent = document.getElementById('main-content');
    const secondaryContent = document.getElementById('secoundary-content');
    const headerTitle = document.querySelector('h1');


   
      
   
    



    

    async function fetchCalendarLinks() {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`;
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                throw new Error(`Error fetching calendar links: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
    
            // Ensure correct fields are mapped (e.g., 'name' and 'CalendarLink')
            return data.records.map(record => ({
                name: record.fields['name'],           // Airtable's display name
                link: record.fields['CalendarLink']    // Airtable's URL field
            }));
        } catch (error) {
            console.error('Error fetching calendar links from Airtable:', error);
            return [];
        }
    }
    
   


    
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
            // Fetch sub options (if needed)
            try {
            } catch (error) {
                console.error('⚠️ Error fetching subcontractor options:', error);
            }
    
            // Fetch all records and store original values
            do {
                const data = await fetchData(offset);
                if (data && Array.isArray(data.records)) {
                    allRecords = allRecords.concat(data.records);
                    // Store original values for change detection
                    data.records.forEach(record => {
                        originalValues[record.id] = { ...record.fields };
                    });
                } else {
                    console.error('⚠️ Error: Invalid data structure or no records found.');
                    break;
                }
                offset = data.offset;
            } while (offset);
    
    
            // Fetch and map field manager names
            const fieldManagerMap = await fetchFieldManagerNames();
    
            // Assign display names instead of record IDs
            allRecords.forEach(record => {
                const managerId = record.fields['Field Manager Assigned']?.[0] || null;
                record.displayFieldManager = managerId && fieldManagerMap[managerId] ? fieldManagerMap[managerId] : 'Unknown';
            });
    
            // ✅ Separate into primary and secondary records
            const primaryRecords = allRecords.filter(record =>
                record.fields['Status'] === 'Field Tech Review Needed' && !record.fields['Field Tech Reviewed']
            );
    
            const secondaryRecords = allRecords.filter(record =>
                record.fields['Status'] === 'Scheduled- Awaiting Field'
            );
    
            // ✅ Sort records alphabetically by Field Manager Name
            primaryRecords.sort((a, b) => a.displayFieldManager.localeCompare(b.displayFieldManager));
            secondaryRecords.sort((a, b) => a.displayFieldManager.localeCompare(b.displayFieldManager));
    
           
    
            // ✅ Display the records in tables
            await displayData(primaryRecords, '#airtable-data', false);
            await displayData(secondaryRecords, '#feild-data', true);
    
    
            // ✅ Ensure merging occurs **after** data is fully loaded
            setTimeout(() => {
                mergeTableCells("#airtable-data", 2);
                mergeTableCells("#feild-data", 2);
            }, 500);
    
            // ✅ Show the content after loading
            mainContent.style.display = 'block';
            secondaryContent.style.display = 'block';
            setTimeout(() => {
                mainContent.style.opacity = '1';
                secondaryContent.style.opacity = '1';
            }, 10);
    
            // ✅ Adjust table widths if necessary
            adjustTableWidth();
            syncTableWidths();
    
        } catch (error) {
            console.error("🚨 Error fetching data:", error);
    
            // Ensure UI remains visible even if data fetching fails
            mainContent.style.display = 'block';
            secondaryContent.style.display = 'block';
            headerTitle.classList.add('visible');
            setTimeout(() => {
                mainContent.style.opacity = '1';
                secondaryContent.style.opacity = '1';
            }, 10);
    
            adjustTableWidth();
            syncTableWidths();
        }
    }
    
    
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("filter-branch").addEventListener("change", function () {
            applyFilters();
        });
    });
    
   
    
    async function fetchFieldManagerNames() {
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/tblHdf9KskO1auw3l`; // Use the correct Table ID
    
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
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}?maxRecords=1`;
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            const data = await response.json();
        } catch (error) {
            console.error('Error fetching fields from Airtable:', error);
        }
    }

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

         // Sort records alphabetically by field 'b'
   // Sort records alphabetically by 'Field Tech'
records.sort((a, b) => {
    const valueA = a.fields['Field Tech'] ? a.fields['Field Tech'].toLowerCase() : '';
    const valueB = b.fields['Field Tech'] ? b.fields['Field Tech'].toLowerCase() : '';
    return valueA.localeCompare(valueB);
});

        
        // Populate rows based on the provided configuration
        records.forEach(record => {
            const fields = record.fields;
            const row = document.createElement('tr');
            const matchingCalendar = calendarLinks.find(calendar => calendar.name === fields['name']);
            const url = matchingCalendar ? matchingCalendar.link : '#';
         

            const cell = document.createElement('td');
            cell.innerHTML = `<a href="${url}" target="_blank">${fields['b'] || 'N/A'}</a>`;
            row.appendChild(cell);
    
            const fieldConfigs = isSecondary ? [
                { field: 'b', value: fields['b'] || 'N/A', link: true },
                { field: 'field tech', value: fields['field tech'] || '', editable: false },

                { 
                    field: 'Lot Number and Community/Neighborhood', 
                    value: fields['Lot Number and Community/Neighborhood'] || 'N/A', 
                    jobDetailsLink: true  // ✅ Define jobDetailsLink here
                }

            ] : [
                { field: 'b', value: fields['b'] || 'N/A', link: true },  // Keep only this "Branch" entry
                { field: 'field tech', value: fields['field tech'] || '', editable: false },
                { 
                    field: 'Lot Number and Community/Neighborhood', 
                    value: fields['Lot Number and Community/Neighborhood'] || 'N/A', 
                    jobDetailsLink: true  // ✅ Define jobDetailsLink here
                }
           
            

               
            ];


            fieldConfigs.forEach(config => {
                const { field, value, editable, link, image, dropdown, email, directions } = config;
                const cell = document.createElement('td');
                cell.dataset.id = record.id;
                cell.dataset.field = field;
                cell.style.wordWrap = 'break-word';
                cell.style.maxWidth = '200px';
                cell.style.position = 'relative';
            
                if (dropdown || field === 'sub') {
                    const select = document.createElement('select');
                    select.classList.add('styled-select');
                    
                    // Define placeholder and options dynamically
                    let placeholderText = '';
                    let filteredOptions = [];
                    
                    // Customize dropdown content based on the field
                    switch (field) {
                        case 'Subcontractor':
                            placeholderText = 'Select a Subcontractor ...';
                            break;
                        case 'Billable/ Non Billable':
                            placeholderText = 'Select Billable Status ...';
                            filteredOptions = billableOptions; // Static list of billable statuses
                            break;
                       
                            case 'Homeowner Builder pay':
                                placeholderText = 'Select a Reason ...';
                                filteredOptions = homeownerbuilderOptions; // Static list of billable reasons
                                break;
                                case 'Billable Reason (If Billable)':
                                    placeholderText = 'Select an option ...';
                                    filteredOptions = reasonOptions; // Static list of billable reasons
                                    break;
                       
                        default:
                            placeholderText = 'Select an Option ...';
                            break;
                    }

const placeholderOption = document.createElement('option');
placeholderOption.value = '';
placeholderOption.textContent = placeholderText;
select.appendChild(placeholderOption);

// Sort and populate options
filteredOptions.sort((a, b) => {
    const nameA = a.name ? a.name.toLowerCase() : a.toLowerCase();
    const nameB = b.name ? b.name.toLowerCase() : b.toLowerCase();
    return nameA.localeCompare(nameB);
});



// Append the dropdown to the cell
cell.appendChild(select);

     

    checkboxElement.addEventListener('change', function () {
        const newValue = checkboxElement.checked;
        updatedFields[record.id] = updatedFields[record.id] || {};
        updatedFields[record.id][field] = newValue;
        hasChanges = true;
        showSubmitButton(record.id);
    });

    cell.appendChild(checkboxElement);

    records.forEach(record => {
       
    
        fieldConfigs.forEach(config => {
            if (config.field.includes("Lot Number")) {
                // Ensure row and cell exist before proceeding
                const jobCell = row.querySelector(`td[data-field="${config.field}"]`);
                const jobIdCell = row.querySelector('td[data-field="b"]');
        
                if (!jobCell || !jobIdCell) {
                    console.warn("⚠️ Job cell or ID cell missing. Skipping...");
                    return;
                }
        
                const jobId = jobIdCell.getAttribute("data-id");
        
                if (!jobId) {
                    console.error("❌ No Job ID found in the 'b' field.");
                    return;
                }
        
                // Store Job ID in localStorage
                localStorage.setItem("selectedJobId", jobId);
        
                // Apply styles to indicate clickable element
                jobCell.style.cursor = 'pointer';
                jobCell.style.color = 'blue';
                jobCell.style.textDecoration = 'underline';
        
                // Ensure old event listeners are removed before adding new ones
                jobCell.replaceWith(jobCell.cloneNode(true));  
                const newCell = row.querySelector(`td[data-field="${config.field}"]`);
        
                newCell.addEventListener('click', () => {
                    console.log(`🔀 Redirecting NOW to job-details.html?id=${jobId}`);
                    window.location.href = `job-details.html?id=${jobId}`;
                });
            }
        });
        
    });
        
}
                else if (link) {
                    const matchingCalendar = calendarLinks.find(calendar => calendar.name === value);
    if (matchingCalendar) {
        cell.innerHTML = `<a href="${matchingCalendar.link}" target="_blank">${value}</a>`;
    } else {
        cell.textContent = value;
    }
                } else if (email) {
                    cell.innerHTML = value ? `<a href="mailto:${value}">${value}</a>` : 'N/A';
                } else if (directions) {
                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}`;
                    cell.innerHTML = value ? `<a href="${googleMapsUrl}" target="_blank">${value}</a>` : 'N/A';
                } else {
                    cell.textContent = value;
                }
    
                if (editable && !dropdown && !image) {
                    cell.setAttribute('contenteditable', 'true');
                    cell.classList.add('editable-cell');
                    const originalContent = cell.textContent;
    
                    cell.addEventListener('blur', () => {
                        const newValue = cell.textContent;
                        if (newValue !== originalContent) {
                            updatedFields[record.id] = updatedFields[record.id] || {};
                            updatedFields[record.id][field] = newValue;
                            hasChanges = true;
                            showSubmitButton(record.id);
                        }
                    });
                }
    
                row.appendChild(cell);
            });
    
            tbody.appendChild(row);
        });
    }
    
    document.querySelectorAll('td[data-field="DOW to be Completed"]').forEach(cell => {
        cell.addEventListener('input', function () {
            const recordId = this.closest('tr').dataset.id;
            handleInputChange.call(this);
            checkForChanges(recordId);
        });
        cell.addEventListener('blur', function () {
            const recordId = this.closest('tr').dataset.id;
            handleInputChange.call(this);
            checkForChanges(recordId);
        });
    });

    document.querySelectorAll('td[data-field="DOW to be Completed"]').forEach(cell => {
        cell.addEventListener('input', function () {
            const recordId = this.closest('tr').dataset.id;
            handleInputChange.call(this);
            checkForChanges(recordId);
        });
        cell.addEventListener('blur', function () {
            const recordId = this.closest('tr').dataset.id;
            handleInputChange.call(this);
            checkForChanges(recordId);
        });
    });

  
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