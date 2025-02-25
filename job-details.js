document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Page Loaded: JavaScript execution started!");
    
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("id");
    const airtableApiKey = window.env.AIRTABLE_API_KEY;
    const airtableBaseId = window.env.AIRTABLE_BASE_ID;
    const airtableTableName = window.env.AIRTABLE_TABLE_NAME;
    console.log("🆔 Record ID from URL:", recordId);

    const fieldReviewNotNeeded = document.getElementById("field-review-not-needed");
    const fieldReviewNeeded = document.getElementById("field-review-needed");
    const messageContainer = document.getElementById("message-container"); // Create a container for the message

     // Ensure only one checkbox can be checked at a time
     fieldReviewNotNeeded.addEventListener("change", function() {
        if (fieldReviewNotNeeded.checked) {
            fieldReviewNeeded.disabled = true; // Disable the other checkbox
            fieldReviewNeeded.checked = false; // Uncheck the other checkbox

            appendMessage("Field Review Not Needed has been selected. Field Review Needed is now disabled.");
        } else {
            fieldReviewNeeded.disabled = false; // Enable the other checkbox when unchecked
            clearMessage();
        }
    });

    fieldReviewNeeded.addEventListener("change", function() {
        if (fieldReviewNeeded.checked) {
            fieldReviewNotNeeded.disabled = true; // Disable the other checkbox
            fieldReviewNotNeeded.checked = false; // Uncheck the other checkbox

            appendMessage("Field Review Needed has been selected. Field Review Not Needed is now disabled.");
        } else {
            fieldReviewNotNeeded.disabled = false; // Enable the other checkbox when unchecked
            clearMessage();
        }
    });

    // Function to append a message to the message container
    function appendMessage(message) {
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        messageElement.style.color = "red";  // Inline style for red color
        messageContainer.appendChild(messageElement);
    }

    // Function to clear the message when checkboxes are unchecked
    function clearMessage() {
        messageContainer.innerHTML = ""; // Clears the message container
    }


    if (!recordId) {
        alert("No job selected.");
        window.location.href = "index.html";
        return;
    }

    try {
        console.log("✅ Fetching Job Details...");

        // ✅ Fetch Primary Job Details
        const primaryData = await fetchAirtableRecord(airtableTableName, recordId);
        console.log("📋 Primary Data Fetched:", primaryData);
        populatePrimaryFields(primaryData.fields);

        // ✅ Fetch Dropbox Token
        dropboxAccessToken = await fetchDropboxToken();
        
        if (!dropboxAccessToken) {
        } else {
        }

        // ✅ Fetch Subcontractors Based on `b` Value and Populate Dropdown
        console.log("✅ Fetching subcontractors based on branch `b`...");
        await fetchAndPopulateSubcontractors(recordId);
        await loadJobDetails(recordId);


    } catch (error) {
        console.error("❌ Error loading job details:", error);
    }   

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
    
        console.log("🔍 Fetching Record from Airtable:", url);
    
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${airtableApiKey}` }
        });
    
        const data = await response.json();
    
        console.log("📌 Total Records Returned:", data.records ? data.records.length : 1);
        
        return data;
    }
    
    
    

    async function updateAirtableRecord(tableName, recordId, fields) {
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
    
        console.log("📡 Sending API Request to Airtable:");
        console.log("🔗 URL:", url);
        console.log("📋 Fields Being Sent:", JSON.stringify(fields, null, 2));
    
        try {
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ fields })
            });
    
            const result = await response.json();
            console.log("📩 Airtable Response:", JSON.stringify(result, null, 2));
    
            if (!response.ok) {
                console.error(`❌ Airtable Error: ${response.status} ${response.statusText}`);
                console.error("📜 Full Error Message from Airtable:", result);
                throw new Error(`Error ${response.status}: ${JSON.stringify(result, null, 2)}`);
            }
    
            console.log("✅ Airtable record updated successfully:", fields);
            alert("Changes saved successfully!");
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            alert(`Error saving job details. ${error.message}`);
        }
    }
    
    document.querySelectorAll(".job-link").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            const jobId = this.dataset.recordId;
            const jobName = this.textContent.trim(); // Get the text (Lot Number and Community/Neighborhood)
            
            console.log("🔗 Navigating to Job:", jobId);
            console.log("🏠 Job Name (Lot Number and Community/Neighborhood):", jobName);
            
            // Ensure the URL updates with the correct job ID
            window.location.href = `job-details.html?id=${jobId}`;
        });
    });
    
    
    
   // 🔹 Populate Primary Fields
function populatePrimaryFields(job) {
    console.log("🛠 Populating UI with Record ID:", job["id"]);
    
    // Ensure "Lot Number and Community/Neighborhood" field is correctly set
    if (job["Lot Number and Community/Neighborhood"]) {
        console.log("✅ Updating UI with Lot Number and Community/Neighborhood:", job["Lot Number and Community/Neighborhood"]);
        setInputValue("job-name", job["Lot Number and Community/Neighborhood"]);
    } else {
        console.warn("⚠️ Missing Lot Number and Community/Neighborhood field in the record.");
    }

    setInputValue("field-tech", job["field tech"]);
    setInputValue("address", job["Address"]);
    setInputValue("homeowner-name", job["Homeowner Name"]);
    setInputValue("contact-email", job["Contact Email"]);
    setInputValue("description", job["Description of Issue"]);
    setInputValue("dow-completed", job["DOW to be Completed"]); 
    setInputValue("field-status", job["Status"]);
    setInputValue("billable-status", job["Billable/ Non Billable"]);
    setInputValue("homeowner-builder", job["Homeowner Builder pay"]);
    setInputValue("billable-reason", job["Billable Reason (If Billable)"]);
    setInputValue("subcontractor", job["Subcontractor"]);
    setInputValue("materials-needed", job["Materials Needed"]);
    setInputValue("subcontractor-payment", job["Subcontractor Payment"]); // ✅ Ensure number is set

    console.log("✅ UI should now have updated values for:", job["Lot Number and Community/Neighborhood"]);

    setCheckboxValue("job-completed", job["Job Completed"]);
    setCheckboxValue("field-review-not-needed", job["Field Review Not Needed"]);

    setCheckboxValue("field-review-needed", job["Field Review Needed"]);
    setCheckboxValue("field-tech-reviewed", job["Field Tech Reviewed"]);

    // Load images from Airtable
    displayImages(job["Picture(s) of Issue"], "issue-pictures");
    displayImages(job["Completed Pictures"], "completed-pictures");

    // If status is "Field Tech Review Needed", hide completed pictures and job completed elements
    if (job["Status"] === "Field Tech Review Needed") {
        console.log("🚨 Field Tech Review Needed - Hiding completed job elements.");

        // Hide Completed Pictures section and file input
        const completedPictures = document.getElementById("completed-pictures");
        const uploadCompletedPicture = document.getElementById("upload-completed-picture");
        if (completedPictures) completedPictures.style.display = "none";
        if (uploadCompletedPicture) uploadCompletedPicture.style.display = "none";

        // Hide Job Completed checkbox
        const jobCompleted = document.getElementById("job-completed");
        if (jobCompleted) jobCompleted.style.display = "none";

        // Hide the Job Completed label
        const jobCompletedLabel = document.getElementById("job-completed-label");
        if (jobCompletedLabel) jobCompletedLabel.style.display = "none";

        // Hide the Completed Pictures heading
        const completedPicturesHeading = document.getElementById("completed-pictures-heading");
        if (completedPicturesHeading) completedPicturesHeading.style.display = "none";
    }
}

    
     
async function loadJobDetails(recordId) {
    try {
        console.log("📡 Fetching job details for:", recordId);
        const jobData = await fetchAirtableRecord(window.env.AIRTABLE_TABLE_NAME, recordId);

        if (jobData && jobData.fields) {
            console.log("✅ Job data fetched:", jobData.fields);

            // Ensure the fetched job matches the `Lot Number and Community/Neighborhood`
            if (jobData.fields["Lot Number and Community/Neighborhood"]) {
                console.log("🏠 Lot Number and Community/Neighborhood:", jobData.fields["Lot Number and Community/Neighborhood"]);
            } else {
                console.warn("⚠️ Missing Lot Number and Community/Neighborhood field.");
            }

            populatePrimaryFields(jobData.fields);
        }
    } catch (error) {
        console.error("❌ Error fetching job details:", error);
    }
}

    
function displayImages(files, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear previous files

    console.log(`📡 Displaying files in: ${containerId}`, files);

    if (files && files.length > 0) {
        files.forEach((file) => {
            console.log("🖼️ Processing file:", file);

            let fileUrl = file.url;

            // Create a wrapper div
            const wrapperDiv = document.createElement("div");
            wrapperDiv.classList.add("file-wrapper");
            wrapperDiv.style.display = "inline-block";
            wrapperDiv.style.margin = "10px";
            wrapperDiv.style.position = "relative";
            wrapperDiv.style.textAlign = "center";

            if (file.type === "application/pdf") {
                // ✅ Embed PDFs in an iframe for direct preview
                const pdfViewer = document.createElement("iframe");
                pdfViewer.src = fileUrl;
                pdfViewer.width = "100%";  // Adjust as needed
                pdfViewer.height = "500px";
                pdfViewer.style.border = "1px solid #ccc";
                pdfViewer.style.borderRadius = "5px";
                pdfViewer.style.backgroundColor = "#fff";
                pdfViewer.allow = "fullscreen";

                // **Fix for Airtable files:** Open in a new tab if preview fails
                pdfViewer.onerror = () => {
                    console.warn("⚠️ PDF cannot be previewed, opening in new tab:", fileUrl);
                    const link = document.createElement("a");
                    link.href = fileUrl;
                    link.target = "_blank";
                    link.textContent = "Open PDF";
                    wrapperDiv.appendChild(link);
                };

                wrapperDiv.appendChild(pdfViewer);
            } else {
                // ✅ Display images normally
                const imgElement = document.createElement("img");
                imgElement.src = fileUrl;
                imgElement.classList.add("uploaded-image");
                imgElement.style.maxWidth = "300px";
                imgElement.style.borderRadius = "5px";
                imgElement.style.border = "1px solid #ddd";
                wrapperDiv.appendChild(imgElement);
            }

            container.appendChild(wrapperDiv);
        });
    } else {
        console.warn("⚠️ No files found.");
        container.innerHTML = "<p>No files available.</p>";
    }
}




    async function testFetchImages() {
        try {
            const recordData = await fetchAirtableRecord(airtableTableName, recordId);
            console.log("✅ Airtable Record Data:", recordData);
    
            if (recordData.fields["Picture(s) of Issue"]) {
                console.log("🖼️ Issue Pictures Field Data:", recordData.fields["Picture(s) of Issue"]);
            } else {
                console.warn("⚠️ 'Picture(s) of Issue' field is empty or missing.");
            }
        } catch (error) {
            console.error("❌ Error fetching test images from Airtable:", error);
        }
    }
    
    testFetchImages();
    
    function addDeleteButton(containerId, targetField) {
        const container = document.getElementById(containerId);
    
        // Remove existing button to prevent duplicates
        const existingButton = document.getElementById(`${containerId}-delete-btn`);
        if (existingButton) {
            existingButton.remove();
        }
    
        // Create delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete Selected";
        deleteButton.id = `${containerId}-delete-btn`;
        deleteButton.style.display = "block";
        deleteButton.style.margin = "10px auto";
        deleteButton.style.padding = "8px 12px";
        deleteButton.style.background = "red";
        deleteButton.style.color = "white";
        deleteButton.style.border = "none";
        deleteButton.style.cursor = "pointer";
        deleteButton.style.borderRadius = "5px";
        deleteButton.style.fontSize = "14px";
    
        deleteButton.addEventListener("click", () => deleteSelectedImages(targetField, containerId));
    
        // Append delete button to container
        container.appendChild(deleteButton);
    }
    
    async function deleteSelectedImages(targetField, containerId) {
        console.log(`🗑️ Deleting selected images from: ${targetField}`);
    
        // Find selected checkboxes
        const selectedCheckboxes = document.querySelectorAll(`#${containerId} .image-checkbox:checked`);
        if (selectedCheckboxes.length === 0) {
            alert("⚠️ Please select at least one image to delete.");
            return;
        }
    
        // Get IDs of selected images
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.imageId);
        console.log("📌 Selected Image IDs to Delete:", selectedIds);
    
        // Fetch current images from Airtable
        let existingImages = await fetchCurrentImagesFromAirtable(recordId, targetField);
        if (!existingImages) {
            existingImages = [];
        }
    
        console.log("📸 Current Images in Airtable:", existingImages);
    
        // Remove only the selected images by matching `id`
        const updatedImages = existingImages.filter(img => !selectedIds.includes(img.id));
        console.log("🔄 Updated Images After Deletion:", updatedImages);
    
        try {
            // Update Airtable with the new image list
            await updateAirtableRecord(airtableTableName, recordId, { [targetField]: updatedImages });
    
            console.log("✅ Selected images deleted successfully!");
    
            // Refresh UI
            displayImages(updatedImages, containerId, targetField);
        } catch (error) {
            console.error("❌ Error deleting images from Airtable:", error);
            alert("Error deleting images. Please try again.");
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
    
        inputs.forEach(input => {
            let fieldName = input.getAttribute("data-field");
    
            if (fieldName) {
                let value;
    
                if (input.type === "checkbox") {
                    value = input.checked;
                } else if (input.tagName === "SELECT") {
                    value = input.value.trim();
                    if (value === "" || value === "undefined") return;
                } else if (input.type === "number") {
                    value = input.value.trim();
                    value = value === "" ? null : parseFloat(value); // ✅ Convert to number or null
                } else {
                    value = input.value.trim();
                    if (value === "") return;
                }
    
                // ✅ Ensure "Subcontractor Payment" is sent as a number
                if (fieldName === "Subcontractor Payment") {
                    value = parseFloat(value);
                    if (isNaN(value)) value = null; // ✅ Prevent invalid values
                }
    
                updatedFields[fieldName] = value;
            }
        });
    
        console.log("📌 Final Fields to be Updated:", JSON.stringify(updatedFields, null, 2));
    
        if (Object.keys(updatedFields).length === 0) {
            console.warn("⚠️ No valid fields found to update.");
            alert("No changes detected.");
            return;
        }
    
        try {
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, recordId, updatedFields);
            console.log("✅ Airtable record updated successfully.");
            alert("Job details saved successfully!");
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            alert("Error saving job details. Please try again.");
        }
    });

    
    // 🔹 Fetch Dropbox Token from Airtable
    async function fetchDropboxToken() {
        try {
            const url = `https://api.airtable.com/v0/${airtableBaseId}/tbl6EeKPsNuEvt5yJ?maxRecords=1&view=viwMlo3nM8JDCIMyV`;
    
            console.log("🔄 Fetching latest Dropbox credentials from Airtable...");
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                throw new Error(`❌ Error fetching Dropbox token: ${response.statusText}`);
            }
    
            const data = await response.json();
            console.log("✅ Dropbox token response:", data);
    
            // Extract fields
            const record = data.records.find(rec => rec.fields["Dropbox Token"]);
            const refreshToken = data.records.find(rec => rec.fields["Dropbox Refresh Token"]);
            const appKey = data.records.find(rec => rec.fields["Dropbox App Key"]);
            const appSecret = data.records.find(rec => rec.fields["Dropbox App Secret"]);
    
            if (!appKey || !appSecret) {
                console.error("❌ Dropbox App Key or Secret is missing in Airtable.");
                return null;
            }
    
            dropboxAppKey = appKey.fields["Dropbox App Key"];
            dropboxAppSecret = appSecret.fields["Dropbox App Secret"];
    
            if (record && record.fields["Dropbox Token"]) {
                dropboxAccessToken = record.fields["Dropbox Token"];
    
                if (refreshToken && refreshToken.fields["Dropbox Refresh Token"]) {
                    return await refreshDropboxAccessToken(
                        refreshToken.fields["Dropbox Refresh Token"], 
                        dropboxAppKey, 
                        dropboxAppSecret
                    );
                }
    
                return dropboxAccessToken;
            } else {
                console.warn("⚠️ No Dropbox Token found in Airtable.");
                return null;
            }
        } catch (error) {
            console.error("❌ Error fetching Dropbox token:", error);
            return null;
        }
    }
    

    async function refreshDropboxAccessToken(refreshToken, dropboxAppKey, dropboxAppSecret) {
        console.log("🔄 Refreshing Dropbox Access Token...");
        const dropboxAuthUrl = "https://api.dropboxapi.com/oauth2/token";
        
        if (!dropboxAppKey || !dropboxAppSecret) {
            console.error("❌ Dropbox App Key or Secret is missing. Cannot refresh token.");
            return null;
        }
    
        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", refreshToken);
        params.append("client_id", dropboxAppKey);
        params.append("client_secret", dropboxAppSecret);
    
        try {
            const response = await fetch(dropboxAuthUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params
            });
    
            if (!response.ok) {
                const errorResponse = await response.json();
                console.error(`❌ Error refreshing Dropbox token: ${errorResponse.error_summary}`);
                return null;
            }
    
            const data = await response.json();
    
            // Store the new access token
            dropboxAccessToken = data.access_token;
            return dropboxAccessToken;
        } catch (error) {
            console.error("❌ Error refreshing Dropbox access token:", error);
            return null;
        }
    }
    
    async function fetchCurrentImagesFromAirtable(recordId, targetField) {
        const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}/${recordId}`;
    
        try {
            console.log(`📡 Fetching existing images from Airtable field: ${targetField}`);
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${airtableApiKey}` }
            });
    
            if (!response.ok) {
                console.error(`❌ Error fetching record: ${response.status} ${response.statusText}`);
                return [];
            }
    
            const data = await response.json();
            return data.fields[targetField] ? data.fields[targetField] : [];
        } catch (error) {
            console.error("❌ Error fetching current images from Airtable:", error);
            return [];
        }
    }
    
    // 🔹 Dropbox Image Upload
    async function uploadToDropbox(files, targetField) {
        if (!dropboxAccessToken) {
            console.error("❌ Dropbox token is missing.");
            return;
        }
    
        console.log(`📂 Uploading ${files.length} file(s) to Dropbox for field: ${targetField}`);
    
        let existingImages = await fetchCurrentImagesFromAirtable(recordId, targetField) || [];
        const uploadedUrls = [...existingImages]; // Preserve existing images
    
        for (const file of files) {
            try {
                const dropboxUrl = await uploadFileToDropbox(file);
                if (dropboxUrl) {
                    uploadedUrls.push({ url: dropboxUrl }); // Append new file URLs
                }
            } catch (error) {
                console.error("❌ Error uploading to Dropbox:", error);
            }
        }
    
        console.log("✅ Final file list to save in Airtable:", uploadedUrls);
    
        if (uploadedUrls.length > 0) {
            await updateAirtableRecord(airtableTableName, recordId, { [targetField]: uploadedUrls });
    
            // 🎯 Refresh UI to show newly uploaded images
            displayImages(uploadedUrls, targetField === "Picture(s) of Issue" ? "issue-pictures" : "completed-pictures", targetField);
        }
    }
    
    // 🔹 Upload File to Dropbox
    async function uploadFileToDropbox(file) {
        console.log("🚀 Starting file upload to Dropbox...");
    
        if (!dropboxAccessToken) {
            console.error("❌ Dropbox Access Token is missing.");
            return null;
        }
    
        const dropboxUploadUrl = "https://content.dropboxapi.com/2/files/upload";
        const path = `/uploads/${encodeURIComponent(file.name)}`;
        console.log(`📤 Uploading file to Dropbox: ${file.name} at path: ${path}`);
    
        try {
            const response = await fetch(dropboxUploadUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${dropboxAccessToken}`,
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
    
            console.log(`📡 Dropbox file upload response status: ${response.status}`);
    
            if (!response.ok) {
                const errorResponse = await response.json();
                console.error("❌ Error uploading file to Dropbox:", errorResponse);
    
                // Check if the error is due to an expired access token
                if (errorResponse.error && errorResponse.error[".tag"] === "expired_access_token") {
                    console.warn("⚠️ Dropbox access token has expired. Fetching a new token...");
                    
                    // Fetch new token and retry
                    dropboxAccessToken = await fetchDropboxToken();
                    
                    if (dropboxAccessToken) {
                        console.log("🔄 Retrying file upload with refreshed token...");
                        return await uploadFileToDropbox(file); // Retry upload with new token
                    } else {
                        console.error("❌ Failed to refresh Dropbox token. Upload cannot proceed.");
                        return null;
                    }
                }
    
                return null;
            }
    
            const data = await response.json();
            console.log("✅ File uploaded to Dropbox successfully:", data);
            return await getDropboxSharedLink(data.path_lower);
        } catch (error) {
            console.error("❌ Error during file upload to Dropbox:", error);
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
    
            if (response.status === 409) {
                console.warn("⚠️ Shared link already exists. Fetching existing link...");
                return await getExistingDropboxLink(filePath);
            }
    
            if (!response.ok) {
                throw new Error("❌ Error creating Dropbox shared link.");
            }
    
            const data = await response.json();
            return convertToDirectLink(data.url);
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
    
    
    async function getExistingDropboxLink(filePath) {
        const url = "https://api.dropboxapi.com/2/sharing/list_shared_links";
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${dropboxAccessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: filePath,
                    direct_only: true
                })
            });
    
            if (!response.ok) {
                throw new Error(`❌ Error fetching existing shared link: ${response.statusText}`);
            }
    
            const data = await response.json();
            if (data.links && data.links.length > 0) {
                return convertToDirectLink(data.links[0].url);
            } else {
                console.error("❌ No existing shared link found.");
                return null;
            }
        } catch (error) {
            console.error("Dropbox existing link fetch error:", error);
            return null;
        }
    }
    
    function convertToDirectLink(sharedUrl) {
        if (sharedUrl.includes("dropbox.com")) {
            return sharedUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "?raw=1");
        }
        return sharedUrl;
    }
    
    document.getElementById("subcontractor-dropdown").addEventListener("change", function () {
        console.log("📌 Subcontractor Selected:", this.value);
    });
        
    function populateSubcontractorDropdown(subcontractors) {
        console.log("📌 Populating the subcontractor dropdown...");
        
        const dropdown = document.getElementById("subcontractor-dropdown");
        if (!dropdown) {
            console.error("❌ Subcontractor dropdown element not found.");
            return;
        }
    
        // Get current selected value (if any)
        const currentSelection = dropdown.getAttribute("data-selected") || dropdown.value;
    
        dropdown.innerHTML = '<option value="">Select a Subcontractor...</option>'; // Reset dropdown
    
        if (subcontractors.length === 0) {
            console.warn("⚠️ No matching subcontractors found.");
            return;
        }
    
        let existingFound = false;
    
        subcontractors.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.name;
            optionElement.textContent = `${option.name} (${option.vanirOffice})`;
    
            // If current selection exists in the new list, mark it as selected
            if (option.name === currentSelection) {
                optionElement.selected = true;
                existingFound = true;
            }
    
            dropdown.appendChild(optionElement);
        });
    
        // If current selection does not exist in new options, append it
        if (currentSelection && !existingFound) {
            console.log(`🔄 Adding previously selected subcontractor: ${currentSelection}`);
            const existingOption = document.createElement("option");
            existingOption.value = currentSelection;
            existingOption.textContent = `${currentSelection} (Previously Selected)`;
            existingOption.selected = true;
            dropdown.appendChild(existingOption);
        }
    
        console.log("✅ Subcontractor dropdown populated successfully.");
    }
    
    // ✅ Call this function when the page loads
    document.addEventListener('DOMContentLoaded', populateSubcontractorDropdown);
    

    // 🔹 Utility Functions
    function setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || "";
    }

     function setCheckboxValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.checked = value || false;
    }
});
