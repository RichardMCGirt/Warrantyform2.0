document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Page Loaded: JavaScript execution started!");
    
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("id");
    const airtableApiKey = window.env.AIRTABLE_API_KEY;
    const airtableBaseId = window.env.AIRTABLE_BASE_ID;
    const airtableTableName = window.env.AIRTABLE_TABLE_NAME;
    const airtableTableName2 = window.env.AIRTABLE_TABLE_NAME2;

    if (!recordId) {
        alert("No job selected.");
        window.location.href = "index.html";
        return;
    }

    let dropboxAccessToken = null;

    try {
        console.log("✅ Fetching Job Details...");

        // ✅ Fetch Primary Job Details
        const primaryData = await fetchAirtableRecord(airtableTableName, recordId);
        console.log("📋 Primary Data Fetched:", primaryData);
        populatePrimaryFields(primaryData.fields);

        // ✅ Fetch Additional Fields (Billable, Subcontractor, etc.)
        const secondaryData = await fetchAirtableRecord(airtableTableName2, recordId);
        console.log("📋 Secondary Data Fetched:", secondaryData);
        populateAdditionalFields(secondaryData.fields);

        // ✅ Fetch Dropbox Token
        dropboxAccessToken = await fetchDropboxToken();
        console.log("🔑 Dropbox Access Token:", dropboxAccessToken);

        // ✅ Fetch Subcontractors Based on `b` Value and Populate Dropdown
        console.log("✅ Fetching subcontractors based on branch `b`...");
        await fetchAndPopulateSubcontractors(recordId);

    } catch (error) {
        console.error("❌ Error loading job details:", error);
    }   



    // ✅ Save Job Details
    document.getElementById("save-job").addEventListener("click", async function () {
        console.log("🔄 Save button clicked. Collecting all field values...");
    
        // Get all input and select elements inside the form or job details container
        const inputs = document.querySelectorAll("#job-details-container input, #job-details-container select, #job-details-container textarea");
    
        const updatedFields = {};
    
        // Loop through inputs and store values in updatedFields object
        inputs.forEach(input => {
            const fieldName = input.getAttribute("data-field"); // Assuming each input has a "data-field" attribute mapping to Airtable fields
            if (fieldName) {
                updatedFields[fieldName] = input.value.trim();
            }
        });
    
        console.log("📌 Fields to be updated:", updatedFields);
    
        if (Object.keys(updatedFields).length === 0) {
            console.warn("⚠️ No valid fields found to update.");
            return;
        }
    
        try {
            await updateAirtableRecord(airtableTableName, recordId, updatedFields);
            console.log("✅ Airtable record updated successfully.");
        } catch (error) {
            console.error("❌ Error updating Airtable record:", error);
        }
    });
    

    // ✅ Handle Dropbox Image Upload
    document.getElementById("upload-issue-picture").addEventListener("change", async function (event) {
        await uploadToDropbox(event.target.files, "Picture(s) of Issue");
    });

    document.getElementById("upload-completed-picture").addEventListener("change", async function (event) {
        await uploadToDropbox(event.target.files, "Completed Pictures");
    });

    // 🔹 Fetch Airtable Record Function
    async function fetchAirtableRecord(tableName, recordId) {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${recordId}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${airtableApiKey}` }
        });
        if (!response.ok) throw new Error(`Error fetching Airtable data: ${response.statusText}`);
        return await response.json();
    }

    // 🔹 Update Airtable Record Function
    async function updateAirtableRecord(tableName, recordId, fields) {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${recordId}`;
    
        try {
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${airtableApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ fields })
            });
    
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
    
            console.log("✅ Airtable record updated successfully:", fields);
            alert("Changes saved successfully!");
    
            // OPTIONAL: Refresh data from Airtable to reflect the saved changes
           // await fetchRecordDetails(recordId);
    
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            alert("Error saving changes. Please try again.");
        }
    }
    

    // 🔹 Populate Primary Fields
    function populatePrimaryFields(job) {
        setInputValue("job-name", job["Lot Number and Community/Neighborhood"]);
        setInputValue("field-tech", job["field tech"]);
        setInputValue("address", job["Address"]);
        setInputValue("homeowner-name", job["Homeowner Name"]);
        setInputValue("contact-email", job["Contact Email"]);
        setInputValue("description", job["Description of Issue"]);
        setInputValue("dow-completed", job["DOW to be Completed"]); 
    }

    // 🔹 Populate Additional Fields
    function populateAdditionalFields(secondaryJob) {
        setInputValue("billable-status", secondaryJob["Billable/ Non Billable"]);
        setInputValue("homeowner-builder", secondaryJob["Homeowner Builder pay"]);
        setInputValue("billable-reason", secondaryJob["Billable Reason (If Billable)"]);
        setInputValue("subcontractor", secondaryJob["Subcontractor"]);
        setInputValue("materials-needed", secondaryJob["Materials Needed"]);
        setInputValue("subcontractor-payment", secondaryJob["Subcontractor Payment"]);

        setCheckboxValue("job-completed", secondaryJob["Job Completed"]);
        setCheckboxValue("field-review-needed", secondaryJob["Field Review Needed"]);
        setCheckboxValue("field-tech-reviewed", secondaryJob["Field Tech Reviewed"]);

        // Load images from Airtable
        displayImages(secondaryJob["Picture(s) of Issue"], "issue-pictures");
        displayImages(secondaryJob["Completed Pictures"], "completed-pictures");
    }

    // 🔹 Display Images
    function displayImages(images, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";
        if (images && images.length > 0) {
            images.forEach(image => {
                const imgElement = document.createElement("img");
                imgElement.src = image.url;
                imgElement.classList.add("uploaded-image");
                container.appendChild(imgElement);
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        console.log("✅ Job Details Page Loaded.");
    
        const formElements = document.querySelectorAll(
            'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
    
        formElements.forEach(element => {
            element.addEventListener("input", () => handleInputChange(element));
            element.addEventListener("change", () => handleInputChange(element));
        });
    
        function handleInputChange(element) {
            console.log(`📝 Field changed: ${element.id}, New Value:`, element.type === "checkbox" ? element.checked : element.value);
        }
    });
    

    document.getElementById("save-job").addEventListener("click", async function () {
        console.log("🔄 Save button clicked. Collecting all field values...");
    
        const updatedFields = {};
        const inputs = document.querySelectorAll("input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
    
        console.log("📋 Found input elements:", inputs); // Debugging
    
        inputs.forEach(input => {
            const fieldName = input.getAttribute("data-field"); // Ensure field is mapped to Airtable
    
            if (fieldName) {
                let value;
    
                // Handle checkboxes properly
                if (input.type === "checkbox") {
                    value = input.checked;
                }
                // Handle number inputs correctly
                else if (input.type === "number") {
                    value = input.value.trim();
                    value = value !== "" ? parseFloat(value) : null; // Convert to float, allow null
                }
                // Handle dropdowns
                else if (input.tagName === "SELECT") {
                    value = input.value;
                }
                // Handle all other fields
                else {
                    value = input.value.trim();
                }
    
                console.log(`📌 Field Detected: ${fieldName}, Value: "${value}"`);
    
                // Ensure only non-empty fields are added
                if (value !== null && value !== "") {
                    updatedFields[fieldName] = value;
                }
            }
        });
    
        console.log("📌 Final Fields to be Updated:", updatedFields);
    
        if (Object.keys(updatedFields).length === 0) {
            console.warn("⚠️ No valid fields found to update.");
            alert("No changes detected.");
            return;
        }
    
        try {
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, recordId, updatedFields);
            console.log("✅ Airtable record updated successfully.");
            alert("Job details saved successfully!");
    
            // Update UI dynamically
            updateUIAfterSave(recordId, updatedFields);
    
        } catch (error) {
            console.error("❌ Error updating Airtable record:", error);
            alert("Error saving job details. Please try again.");
        }
    });
    
    
    
    function updateUIAfterSave(recordId, updatedFields) {
        console.log(`🔄 Updating UI for Record ID: ${recordId} with`, updatedFields);
    
        Object.keys(updatedFields).forEach(field => {
            // Find the table cell or input that matches the field
            const cell = document.querySelector(`[data-id="${recordId}"][data-field="${field}"]`);
            const input = document.querySelector(`input[data-field="${field}"]`);
    
            if (cell) {
                cell.textContent = updatedFields[field]; // Update table cell text
            } else if (input) {
                input.value = updatedFields[field]; // Update input field value
            }
        });
    
        console.log("✅ UI updated successfully without refreshing.");
    }
    
    

    // 🔹 Fetch Dropbox Token
    async function fetchDropboxToken() {
        try {
            const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName2}`, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });

            if (!response.ok) throw new Error("Error fetching Dropbox credentials");

            const data = await response.json();
            const record = data.records.find(rec => rec.fields["Dropbox Token"]);

            return record ? record.fields["Dropbox Token"] : null;
        } catch (error) {
            console.error("Dropbox token fetch error:", error);
            return null;
        }
    }

    // 🔹 Dropbox Image Upload
    async function uploadToDropbox(files, targetField) {
        if (!dropboxAccessToken) {
            console.error("Dropbox token is missing.");
            return;
        }

        const uploadedUrls = [];
        for (const file of files) {
            try {
                const dropboxUrl = await uploadFileToDropbox(file);
                if (dropboxUrl) uploadedUrls.push({ url: dropboxUrl });
            } catch (error) {
                console.error("Error uploading to Dropbox:", error);
            }
        }

        if (uploadedUrls.length > 0) {
            await updateAirtableRecord(airtableTableName, recordId, { [targetField]: uploadedUrls });
        }
    }

    // 🔹 Upload File to Dropbox
    async function uploadFileToDropbox(file) {
        const dropboxUploadUrl = "https://content.dropboxapi.com/2/files/upload";
        const path = `/uploads/${file.name}`;

        try {
            const response = await fetch(dropboxUploadUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dropboxAccessToken}`,
                    "Dropbox-API-Arg": JSON.stringify({
                        path: path,
                        mode: "add",
                        autorename: true,
                        mute: false
                    }),
                    "Content-Type": "application/octet-stream"
                },
                body: file
            });

            if (!response.ok) throw new Error("Error uploading file to Dropbox.");
            const data = await response.json();
            return await getDropboxSharedLink(data.path_lower);
        } catch (error) {
            console.error("Dropbox upload error:", error);
            return null;
        }
    }

    // 🔹 Get Dropbox Shared Link
    async function getDropboxSharedLink(filePath) {
        const url = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dropboxAccessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: filePath,
                    settings: {
                        requested_visibility: "public"
                    }
                })
            });

            if (!response.ok) throw new Error("Error creating Dropbox shared link.");
            const data = await response.json();
            return data.url.replace("?dl=0", "?raw=1");
        } catch (error) {
            console.error("Dropbox link error:", error);
            return null;
        }
    }

    async function fetchAndPopulateSubcontractors(recordId) {
        console.log("🚀 Fetching branch `b` for record:", recordId);
    
        const airtableBaseId = window.env.AIRTABLE_BASE_ID;
        const primaryTableId = "tbl6EeKPsNuEvt5yJ"; // Table where `b` is found
        const subcontractorTableId = "tbl9SgC5wUi2TQuF7"; // Subcontractor Table
    
        if (!recordId) {
            console.error("❌ Record ID is missing.");
            return;
        }
    
        try {
            // 1️⃣ Fetch `b` from the primary table
            const primaryUrl = `https://api.airtable.com/v0/${airtableBaseId}/${primaryTableId}/${recordId}`;
            console.log(`🔗 Fetching Branch URL: ${primaryUrl}`);
    
            const primaryResponse = await fetch(primaryUrl, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!primaryResponse.ok) {
                throw new Error(`❌ Error fetching primary record: ${primaryResponse.statusText}`);
            }
    
            const primaryData = await primaryResponse.json();
            const branchB = primaryData.fields?.b;
    
            if (!branchB) {
                console.warn("⚠️ No branch `b` found for this record.");
                return;
            }
    
            console.log(`📌 Found Branch 'b': ${branchB}`);
    
            // 2️⃣ Fetch subcontractors where `Vanir Branch` matches `b`
            console.log(`🚀 Fetching subcontractors where Vanir Branch = '${branchB}'`);
    
            const subcontractorUrl = `https://api.airtable.com/v0/${airtableBaseId}/${subcontractorTableId}?filterByFormula=${encodeURIComponent(`{Vanir Branch} = '${branchB}'`)}&fields[]=Subcontractor Company Name&fields[]=Vanir Branch`;
    
            console.log(`🔗 Fetching Subcontractors URL: ${subcontractorUrl}`);
    
            const subcontractorResponse = await fetch(subcontractorUrl, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!subcontractorResponse.ok) {
                throw new Error(`❌ Error fetching subcontractors: ${subcontractorResponse.statusText}`);
            }
    
            const subcontractorData = await subcontractorResponse.json();
            console.log("📦 Subcontractor API Response:", subcontractorData);
    
            const subcontractors = subcontractorData.records.map(record => ({
                name: record.fields['Subcontractor Company Name'] || 'Unnamed Subcontractor',
                vanirOffice: record.fields['Vanir Branch'] || 'Unknown Branch'
            }));
    
            console.log("✅ Filtered Subcontractors:", subcontractors);
    
            // 3️⃣ Populate the dropdown
            populateSubcontractorDropdown(subcontractors);
    
        } catch (error) {
            console.error("❌ Error:", error);
        }
    }
    
    
    
       
   
    
    
    
    
    // ✅ Populate Dropdown with Sorted Subcontractors
    function populateSubcontractorDropdown(subcontractors) {
        console.log("📌 Populating the subcontractor dropdown...");
    
        const dropdown = document.getElementById("subcontractor-dropdown");
    
        if (!dropdown) {
            console.error("❌ Subcontractor dropdown element not found.");
            return;
        }
    
        dropdown.innerHTML = '<option value="">Select a Subcontractor...</option>'; // Reset dropdown
    
        if (subcontractors.length === 0) {
            console.warn("⚠️ No matching subcontractors found.");
            return;
        }
    
        subcontractors.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.name;
            optionElement.textContent = `${option.name} (${option.vanirOffice})`;
            dropdown.appendChild(optionElement);
        });
    
        console.log("✅ Subcontractor dropdown populated successfully.");
    }
    
    
    
    // ✅ Call this function when the page loads
    document.addEventListener('DOMContentLoaded', populateSubcontractorDropdown);
    

    // 🔹 Utility Functions
    function setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || "";
    }

    function getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : "";
    }

    function setCheckboxValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.checked = value || false;
    }
});
