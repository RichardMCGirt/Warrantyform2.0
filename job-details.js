function openMapApp() {
    const addressInput = document.getElementById("address");

    if (!addressInput || !addressInput.value) {
        alert("⚠️ No address available.");
        return;
    }

    const address = encodeURIComponent(addressInput.value.trim());
    const userAgent = navigator.userAgent.toLowerCase();

    // Automatically open Apple Maps on iOS
    if (userAgent.match(/(iphone|ipad|ipod)/i)) {
        window.location.href = `maps://maps.apple.com/?q=${address}`;
        return;
    }

    // Automatically open Google Maps on Android
    if (userAgent.match(/android/i)) {
        window.location.href = `geo:0,0?q=${address}`;
        return;
    }

    // Create a modal for other devices (Desktop, etc.)
    const modal = document.createElement("div");
    modal.id = "mapModal";
    modal.style.position = "fixed";
    modal.style.top = "50%";
    modal.style.left = "50%";
    modal.style.transform = "translate(-50%, -50%)";
    modal.style.background = "#fff";
    modal.style.padding = "20px";
    modal.style.borderRadius = "10px";
    modal.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
    modal.style.zIndex = "1000";
    modal.style.textAlign = "center";

    // Modal content
    modal.innerHTML = `
        <h3>Select Navigation App</h3>
        <button id="googleMapsBtn" style="padding:10px; margin:5px; background:#4285F4; color:white; border:none; border-radius:5px; cursor:pointer;">Google Maps</button>
        <button id="wazeBtn" style="padding:10px; margin:5px; background:#1DA1F2; color:white; border:none; border-radius:5px; cursor:pointer;">Waze</button>
        <button id="closeModalBtn" style="padding:10px; margin:5px; background:#d9534f; color:white; border:none; border-radius:5px; cursor:pointer;">Close</button>
    `;

    document.body.appendChild(modal);

    // Event listeners for buttons
    document.getElementById("googleMapsBtn").addEventListener("click", function () {
        window.location.href = `https://www.google.com/maps/search/?api=1&query=${address}`;
    });

    document.getElementById("wazeBtn").addEventListener("click", function () {
        window.location.href = `https://waze.com/ul?q=${address}`;
    });

    document.getElementById("closeModalBtn").addEventListener("click", function () {
        document.body.removeChild(modal);
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    console.log("🚀 Page Loaded: JavaScript execution started!");

    // ✅ Extract URL Parameters
    const params = new URLSearchParams(window.location.search);
    let recordId = params.get("id");

    if (!recordId || recordId.trim() === "") {
        console.error("❌ ERROR: No record ID found in URL!");
        alert("No job selected. Redirecting to job list.");
        window.location.href = "index.html"; // Redirect to job list
        return;
    }

    console.log("✅ Record ID retrieved:", recordId);

    // ✅ Fetch Airtable API keys from environment
    const airtableApiKey = window.env?.AIRTABLE_API_KEY || "Missing API Key";
    const airtableBaseId = window.env?.AIRTABLE_BASE_ID || "Missing Base ID";
    const airtableTableName = window.env?.AIRTABLE_TABLE_NAME || "Missing Table Name";

    console.log("🔑 Airtable Credentials:", {
        API_Key: airtableApiKey ? "Loaded" : "Not Found",
        Base_ID: airtableBaseId,
        Table_Name: airtableTableName,
    });

    if (!airtableApiKey || !airtableBaseId || !airtableTableName) {
        console.error("❌ Missing Airtable credentials! Please check your environment variables.");
        alert("Configuration error: Missing Airtable credentials.");
        return;
    }

    try {
        console.log("✅ Fetching Job Details...");

        // ✅ Fetch Primary Job Details
        const primaryData = await fetchAirtableRecord(airtableTableName, recordId);
        console.log("📋 Primary Data Fetched:", primaryData);

        // ✅ Extract Lot Name
        let lotName = primaryData.fields["Lot Number and Community/Neighborhood"];
        console.log("🏠 Extracted Lot Name:", lotName);

        if (!lotName) {
            console.error("❌ ERROR: Lot Name not found in Airtable record.");
            alert("Error: Lot Name is missing for this job.");
            return;
        }

        // ✅ Populate UI with Primary Fields
        populatePrimaryFields(primaryData.fields);

        // ✅ Fetch Dropbox Token
        dropboxAccessToken = await fetchDropboxToken();

        // ✅ Fetch Subcontractors Based on `b` Value and Populate Dropdown
        console.log("✅ Fetching subcontractors based on branch `b`...");
        await fetchAndPopulateSubcontractors(recordId);

        // ✅ Load images using Lot Name
        await loadImagesForLot(lotName, primaryData.fields["Status"]);

        /** ✅ Add Event Listener for Deleting Images **/
        const deleteBtn = document.getElementById("delete-images-btn");

        if (!deleteBtn) {
            console.error("❌ ERROR: 'delete-images-btn' not found in DOM.");
        } else {
            console.log("✅ Delete button found in DOM!");
            deleteBtn.addEventListener("click", async function () {
                console.log("🗑️ Delete button clicked!");

                if (!lotName) {
                    console.error("❌ ERROR: Lot Name is missing when deleting images.");
                    alert("Error: Lot Name not found.");
                    return;
                }

                console.log("🗑️ Deleting images for Lot Name:", lotName);

                const checkboxes = document.querySelectorAll(".image-checkbox:checked");

                if (checkboxes.length === 0) {
                    alert("⚠️ Please select at least one image to delete.");
                    console.log("⚠️ No images selected.");
                    return;
                }

                console.log("📌 Selected Images for Deletion:", checkboxes.length);

                const imageIndexes = Array.from(checkboxes).map(cb => {
                    const index = parseInt(cb.dataset.index);
                    return isNaN(index) ? null : index;
                }).filter(index => index !== null);
                
                console.log("📌 Image Indexes to Delete:", imageIndexes);

                // Delete images by Lot Name
                await deleteImagesByLotName(lotName, imageIndexes, "Completed  Pictures");

                console.log("✅ Image deletion process completed.");
            });
        }
    } catch (error) {
        console.error("❌ Error loading job details:", error);
    }

    // ✅ Handle Dropbox Image Upload
    document.getElementById("upload-issue-picture").addEventListener("change", async function (event) {
        const files = event.target.files;
       
        // Upload to Dropbox
        await uploadToDropbox(files, "Picture(s) of Issue");
    });
    

    document.getElementById("upload-completed-picture").addEventListener("change", async function (event) {
        const files = event.target.files;
        
        // Upload to Dropbox
        await uploadToDropbox(files, "Completed  Pictures");
    });
    

    // 🔹 Fetch Airtable Record Function
    async function fetchAirtableRecord(tableName, lotNameOrRecordId) {
        console.log("📡 Fetching record for:", lotNameOrRecordId);
    
        if (!lotNameOrRecordId) {
            console.error("❌ Lot Name or Record ID is missing. Cannot fetch record.");
            return null;
        }
    
        let recordId = lotNameOrRecordId;
    
        // ✅ Check if the given `lotNameOrRecordId` is already an Airtable record ID
        if (!recordId.startsWith("rec")) {
            console.log("🔍 Searching for Record ID using Lot Name...");
            recordId = await getRecordIdByLotName(lotNameOrRecordId);
            
            if (!recordId) {
                console.warn(`⚠️ No record found for Lot Name: "${lotNameOrRecordId}"`);
                return null;
            }
        }
    
        // ✅ Use Record ID to fetch data
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
        console.log("🔗 Airtable API Request:", url);
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                console.error(`❌ Error fetching record: ${response.status} ${response.statusText}`);
                return null;
            }
    
            const data = await response.json();
            console.log("✅ Airtable Record Data:", data);
    
            if (data.fields && !data.fields["Completed Pictures"]) {
                console.warn("⚠️ 'Completed Pictures' field is missing. Initializing as empty array.");
                data.fields["Completed Pictures"] = []; // Prevent undefined errors
            }
    
            return data;
        } catch (error) {
            console.error("❌ Error fetching Airtable record:", error);
            return null;
        }
    }

    async function getRecordIdByLotName(lotName) {
        if (!lotName) {
            console.error("❌ Lot Name is missing. Cannot fetch record ID.");
            return null;
        }
    
        // ✅ If already a Record ID, return it immediately
        if (lotName.startsWith("rec")) {
            console.log("✅ Given value is already a Record ID:", lotName);
            return lotName;
        }
    
        console.log(`🔍 Searching for Record ID using Lot Name: "${lotName}"`);
    
        // ✅ Ensure special characters are properly encoded
        const filterFormula = `{Lot Number and Community/Neighborhood} = "${lotName}"`;
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
        console.log("🔗 Airtable API Request:", url);
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                console.error(`❌ Error fetching record ID: ${response.status} ${response.statusText}`);
                return null;
            }
    
            const data = await response.json();
    
            if (data.records.length === 0) {
                console.warn(`⚠️ No matching record found for Lot Name: "${lotName}"`);
                return null;
            }
    
            console.log("✅ Found Record ID:", data.records[0].id);
            return data.records[0].id;
        } catch (error) {
            console.error("❌ Error fetching record ID by Lot Name:", error);
            return null;
        }
    }
    
    async function updateAirtableRecord(tableName, lotNameOrRecordId, fields) {
        console.log("📡 Updating Airtable record for:", lotNameOrRecordId);
    
        const saveButton = document.getElementById("save-job");
        if (saveButton) saveButton.disabled = true;
    
        try {
            let recordId = lotNameOrRecordId;
    
            // ✅ If not a record ID, find the corresponding record ID
            if (!recordId.startsWith("rec")) {
                console.log("🔍 Searching for Record ID using Lot Name...");
                recordId = await getRecordIdByLotName(lotNameOrRecordId);
                if (!recordId) {
                    console.error("❌ No record ID found for this Lot Name. Cannot update Airtable.");
                    showToast("❌ Error: No record found for this Lot Name.", "error");
    
                    if (saveButton) saveButton.disabled = false;
                    return;
                }
            }
    
            const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
            console.log("📡 Sending API Request to Airtable:", url);
            console.log("📋 Fields Being Sent:", JSON.stringify(fields, null, 2));
    
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ fields })
            });
    
            if (!response.ok) {
                console.error(`❌ Airtable Error: ${response.status} ${response.statusText}`);
                showToast(`❌ Error ${response.status}: ${response.statusText}`, "error");
    
                if (saveButton) saveButton.disabled = false;
                return;
            }
    
            console.log("✅ Airtable record updated successfully:", fields);
    
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            showToast(`❌ Error saving job details: ${error.message}`, "error");
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }
    
function toggleDeleteButton() {
    const deleteButton = document.getElementById("delete-images-btn");
    const images = document.querySelectorAll(".image-container img"); // Change selector based on your structure

    if (images.length > 0) {
        deleteButton.style.display = "block"; // Show button if images exist
    } else {
        deleteButton.style.display = "none"; // Hide button if no images
    }
}

// ✅ Call this function after images load or after deletion
document.addEventListener("DOMContentLoaded", toggleDeleteButton);
    
    
    document.querySelectorAll(".job-link").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
    
            const jobId = this.dataset.recordId?.trim(); // Ensure valid ID
            const jobName = this.textContent.trim(); // Lot Number / Community
    
            if (!jobId) {
                console.error("❌ ERROR: Missing job ID in the link. Check 'data-record-id' attribute.");
                alert("Error: No job ID found. Please try again.");
                return;
            }
    
            console.log("🔗 Navigating to Job:", jobId);
            console.log("🏠 Job Name:", jobName);
    
            // Construct the URL properly
            const url = new URL(window.location.origin + window.location.pathname);
            url.searchParams.set("id", jobId);
    
            console.log("🌍 Navigating to:", url.toString());
            window.location.href = url.toString();
        });
    });
    
// 🔹 Populate Primary Fields
async function populatePrimaryFields(job) { // ✅ Make function async
    console.log("🛠 Populating UI with Record ID:", job["id"]);

    setInputValue("job-name", job["Lot Number and Community/Neighborhood"]);
    setInputValue("field-tech", job["field tech"]);
    setInputValue("address", job["Address"]);
    setInputValue("homeowner-name", job["Homeowner Name"]);
    setInputValue("contact-email", job["Contact Email"]);
    setInputValue("description", job["Description of Issue"]);
    setInputValue("dow-completed", job["DOW to be Completed"]); 
    setInputValue("field-status", job["Status"]);

    console.log("✅ Images Loaded - Checking Status...");

    // ✅ If status is "Scheduled - Awaiting Field", delete images
    if (job["Status"] === "Scheduled- Awaiting Field") {
        console.log("🚨 Job is 'Scheduled - Awaiting Field' - Deleting completed images...");
        
        // ✅ Ensure deletion completes before continuing
        await deleteImagesByLotName(job["Lot Number and Community/Neighborhood"], [], "Completed  Pictures");

        hideElementById("billable-status");
        hideElementById("homeowner-builder");
        hideElementById("subcontractor");
        hideElementById("materials-needed");
        hideElementById("subcontractor-payment");
        hideElementById("billable-reason");
        hideElementById("field-review-not-needed");
        hideElementById("subcontractor-dropdown1-label");
        hideElementById("subcontractor-dropdown1");
        hideElementById("field-review-needed");
        hideElementById("field-tech-reviewed");
        hideElementById("subcontractor-dropdown");
        hideElementById("additional-fields-container");
        hideElementById("message-container");
    } else {
        console.log("✅ Status is NOT 'Scheduled- Awaiting Field' - Showing all fields.");
        showElement("job-completed");
        showElement("job-completed-label");

        setInputValue("billable-status", job["Billable/ Non Billable"]);
        setInputValue("homeowner-builder", job["Homeowner Builder pay"]);
        setInputValue("billable-reason", job["Billable Reason (If Billable)"]);
        setInputValue("subcontractor", job["Subcontractor"]);
        setInputValue("materials-needed", job["Materials Needed"]);
        setInputValue("subcontractor-payment", job["Subcontractor Payment"]); 

        setCheckboxValue("field-tech-reviewed", job["Field Tech Reviewed"]);
    }

    setCheckboxValue("job-completed", job["Job Completed"]);

    // ✅ Hide elements if "Field Tech Review Needed"
    if (job["Status"] === "Field Tech Review Needed") {
        console.log("🚨 Field Tech Review Needed - Hiding completed job elements.");
        hideElementById("completed-pictures");
        hideElementById("upload-completed-picture");
        hideElementById("job-completed");
        hideElementById("job-completed-label");
        hideElementById("completed-pictures-heading");
        hideElementById("upload-completed-picture"); 
        hideElementById("file-input-container"); 
    }

    showElement("save-job"); 
}

// Function to hide an element safely
function hideElementById(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = "none";
    } else {
        console.warn(`⚠️ Element not found: ${elementId}`);
    }
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = "block";
    } else {
        console.warn(`⚠️ Element not found: ${elementId}`);
    }
}

async function displayImages(files, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container not found: ${containerId}`);
        return;
    }

    container.innerHTML = ""; // Clear existing content

    if (!files || files.length === 0) {
        console.warn(`⚠️ No files found in ${containerId}`);
        container.innerHTML = "<p>No files found.</p>";
        
        // ✅ Hide delete button if both are empty
        checkAndHideDeleteButton();
        return;
    }

    console.log(`✅ Displaying files for ${containerId}:`, files);

    for (const file of files) {
        if (!file.url) {
            console.error("❌ Missing 'url' field in file object:", file);
            continue;
        }
    
        const wrapperDiv = document.createElement("div");
        wrapperDiv.classList.add("file-wrapper");
        wrapperDiv.style.display = "inline-block";
        wrapperDiv.style.margin = "10px";
        wrapperDiv.style.position = "relative";
        wrapperDiv.style.textAlign = "center";
        wrapperDiv.style.width = "200px";
    
        // ✅ Declare checkbox properly before using it
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("file-checkbox", "image-checkbox");
        checkbox.dataset.imageId = file.id || "";
    
        // ✅ Add event listener inside the loop
        checkbox.addEventListener("change", function () {
            wrapperDiv.classList.toggle("checked", this.checked);
        });
    
        // Overlay text for "Marked for Deletion"
        const overlay = document.createElement("div");
        overlay.classList.add("marked-for-deletion");
        overlay.innerText = "Marked for Deletion";

        // Handle checkbox state changes
        checkbox.addEventListener("change", function () {
            if (this.checked) {
                wrapperDiv.classList.add("checked");
            } else {
                wrapperDiv.classList.remove("checked");
            }
        });

        // Filename label
        const fileLabel = document.createElement("p");
        fileLabel.innerText = file.filename || "Unknown File";
        fileLabel.style.fontSize = "12px";
        fileLabel.style.marginTop = "5px";
        fileLabel.style.wordBreak = "break-word"; 

        let previewElement;

        if (file.type && file.type === "application/pdf") {
            previewElement = document.createElement("canvas");
            previewElement.style.width = "100%";
            previewElement.style.border = "1px solid #ddd";
            previewElement.style.borderRadius = "5px";
            previewElement.style.cursor = "pointer";

            previewElement.addEventListener("click", () => window.open(file.url, "_blank"));

            try {
                const pdf = await pdfjsLib.getDocument(file.url).promise;
                const page = await pdf.getPage(1);
                const scale = 1;
                const viewport = page.getViewport({ scale });
                const context = previewElement.getContext("2d");
                previewElement.height = viewport.height;
                previewElement.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                });
            } catch (error) {
                console.error("❌ Error loading PDF preview:", error);
                previewElement = document.createElement("iframe");
                previewElement.src = file.url;
                previewElement.width = "180";
                previewElement.height = "220";
                previewElement.style.borderRadius = "10px";
                previewElement.style.border = "1px solid #ddd";
            }
        } else if (file.type && typeof file.type === "string" && file.type.startsWith("image/")) {
            previewElement = document.createElement("img");
            previewElement.src = file.url;
            previewElement.setAttribute("data-file-id", file.id || "");
            previewElement.classList.add("uploaded-file");
            previewElement.style.maxWidth = "100%";
            previewElement.style.borderRadius = "5px";
            previewElement.style.border = "1px solid #ddd";
            previewElement.style.cursor = "pointer";

            previewElement.addEventListener("click", () => window.open(file.url, "_blank"));
        } else {
            previewElement = document.createElement("a");
            previewElement.href = file.url;
            previewElement.innerText = "Download File";
            previewElement.target = "_blank";
            previewElement.style.display = "block";
            previewElement.style.padding = "5px";
            previewElement.style.background = "#f4f4f4";
            previewElement.style.borderRadius = "5px";
            previewElement.style.textDecoration = "none";
        }

        // Append elements
        wrapperDiv.appendChild(checkbox);
        wrapperDiv.appendChild(overlay);
        wrapperDiv.appendChild(previewElement);
        wrapperDiv.appendChild(fileLabel);
        container.appendChild(wrapperDiv);
    }

    container.style.display = "none";
    container.offsetHeight;
    container.style.display = "block";

    console.log(`✅ Files displayed for ${containerId}`);
    // ✅ Check if we need to show or hide delete button
    checkAndHideDeleteButton();
}
   
function checkAndHideDeleteButton() {
    const deleteButton = document.getElementById("delete-images-btn");
    const issueImages = document.querySelectorAll("#issue-pictures .file-wrapper").length;
    const completedImages = document.querySelectorAll("#completed-pictures .file-wrapper").length;

    if (issueImages === 0 && completedImages === 0) {
        console.log("🛑 No images found. Hiding delete button.");
        deleteButton.style.display = "none";
    } else {
        console.log("✅ Images found. Showing delete button.");
        deleteButton.style.display = "block";
    }
}



document.getElementById("delete-images-btn").addEventListener("click", async function (event) {
    event.preventDefault(); // ✅ Prevents page refresh
    console.log("🗑️ Delete Images button clicked! ✅");

    const checkboxes = document.querySelectorAll(".image-checkbox:checked");
    if (checkboxes.length === 0) {
        alert("⚠️ Please select at least one image to delete.");
        console.log("⚠️ No images selected.");
        return;
    }

    const lotName = document.getElementById("job-name")?.value?.trim();
    if (!lotName) {
        console.error("❌ ERROR: Lot Name not found.");
        alert("Error: Lot Name not found. Please try again.");
        return;
    }

    // 🔹 Extract selected image IDs
    const imageIdsToDelete = Array.from(checkboxes).map(cb => cb.dataset.imageId).filter(id => id);
    console.log("📌 Selected Image IDs to Delete:", imageIdsToDelete);

    if (imageIdsToDelete.length === 0) {
        console.warn("⚠️ No valid image IDs found for deletion.");
        return;
    }

    // 🔹 Delete from both "Picture(s) of Issue" and "Completed Pictures"
    await deleteImagesByLotName(lotName, imageIdsToDelete, "Picture(s) of Issue");
    await deleteImagesByLotName(lotName, imageIdsToDelete, "Completed  Pictures");

    console.log("✅ Images deleted successfully from both fields!");

    // ✅ Refresh UI to reflect changes
    await loadImagesForLot(lotName, document.getElementById("field-status")?.value);
});

/** ✅ Function to remove images from Airtable */
async function deleteImagesByLotName(lotName, imageIdsToDelete, imageField) {
    console.log(`🗑️ Attempting to delete images from '${imageField}' for Lot Name:`, lotName);

    if (!lotName) {
        console.error("❌ Lot Name is missing. Cannot delete images.");
        return;
    }

    // Fetch existing images
    let existingImages = await fetchImagesByLotName(lotName, imageField);
    if (!existingImages || existingImages.length === 0) {
        console.warn(`⚠️ No images found in '${imageField}'. Skipping deletion.`);
        return;
    }

    console.log(`📸 Current Images in '${imageField}' Before Deletion:`, existingImages);

    // Remove selected images
    console.log("📌 Existing images before deletion:", existingImages);
    const updatedImages = existingImages.filter(img => !imageIdsToDelete.includes(img.id));
    console.log("📌 Updated image list after deletion:", updatedImages);
    
    console.log(`🗑️ Deleting images from '${imageField}' for Lot Name: ${lotName}`);

try {
    console.log(`📩 Sending updated image list to Airtable for '${imageField}':`, updatedImages);
    await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, lotName, {
        [imageField]: updatedImages.length > 0 ? updatedImages : []
    });
    console.log(`✅ Images deleted from '${imageField}'!`);
} catch (error) {
    console.error(`❌ Error deleting images from '${imageField}' in Airtable:`, error);
}

}

async function fetchImagesByLotName(lotName, imageField) {
    console.log("📡 Fetching images for Lot Name:", lotName);

    if (!lotName) {
        console.error("❌ Lot Name is missing. Cannot fetch images.");
        return [];
    }

    // ✅ Trim lotName to remove accidental spaces
    lotName = lotName.trim();

    // ✅ Escape special characters in lot name (Double quotes are preferred)
    const filterFormula = `AND({Lot Number and Community/Neighborhood}="${lotName}")`;
    const formattedImageField = encodeURIComponent(imageField);

    // ✅ Construct the API URL
    const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}&fields[]=${formattedImageField}`;

    console.log("🔗 Airtable API Request:", url);

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
        });

        if (!response.ok) {
            console.error("❌ Error fetching record:", response.status, response.statusText);
            return [];
        }

        const data = await response.json();

        if (data.records.length === 0) {
            console.warn(`⚠️ No records found for Lot Name: ${lotName}`);
            return [];
        }

        // ✅ Fetch the first matching record
        const record = data.records[0];

        if (record.fields && record.fields[imageField]) {
            console.log(`✅ Images found for '${lotName}' in field '${imageField}':`, record.fields[imageField]);
            return record.fields[imageField];
        } else {
            console.warn(`⚠️ No images found in field '${imageField}' for '${lotName}'`);
            return [];
        }
    } catch (error) {
        console.error("❌ Error fetching images by Lot Name:", error);
        return [];
    }
}

async function loadImagesForLot(lotName, status) {
    console.log("📡 Loading images for lot:", lotName, "| Status:", status);

    const imageField = (status === "Field Tech Review Needed") ? "Picture(s) of Issue" : "Completed  Pictures";

    const images = await fetchImagesByLotName(lotName, imageField);
    console.log(`🖼️ Loaded Images from ${imageField}:`, images);

    displayImages(images, imageField === "Picture(s) of Issue" ? "issue-pictures" : "completed-pictures");
}

    async function testFetchImages() {
        try {
            const recordData = await fetchAirtableRecord(airtableTableName, recordId);
            console.log("✅ Airtable Record Data:", recordData);
    
            if (recordData.fields["Picture(s) of Issue"]) {
                console.log("🖼️ Issue Pictures Field Data:", recordData.fields["Picture(s) of Issue"]);
                console.log("🖼️ Completed Pictures Field Data:", recordData.fields["Completed  Pictures"]);

            } else {
                console.warn("⚠️ 'Picture(s) of Issue' field is empty or missing.");
            }
        } catch (error) {
            console.error("❌ Error fetching test images from Airtable:", error);
        }
    }
    
    testFetchImages();
    document.getElementById("delete-images-btn").addEventListener("click", function () {
        console.log("🗑️ Delete Images button clicked! ✅");
    });
    
    // ✅ Save record ID in localStorage before navigating away
function saveRecordIdToLocal(recordId) {
    localStorage.setItem("currentRecordId", recordId);
}

// ✅ Retrieve record ID from localStorage on page load
function getSavedRecordId() {
    return localStorage.getItem("currentRecordId");
}

// ✅ Set the record ID on page load
document.addEventListener("DOMContentLoaded", () => {
    let recordId = getSavedRecordId() || new URLSearchParams(window.location.search).get("id");

    if (!recordId) {
        console.error("❌ No record ID found! Preventing redirect loop.");
        alert("No job selected.");
        return; // ✅ Prevents infinite redirects
    }

    console.log("🆔 Using saved Record ID:", recordId);
    saveRecordIdToLocal(recordId); 
});


    document.addEventListener("DOMContentLoaded", function () {
        console.log("✅ Job Details Page Loaded.");
    
        const formElements = document.querySelectorAll(
            'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
    
        formElements.forEach(element => {
            element.addEventListener("input", () => handleInputChange(element), { once: true });
            element.addEventListener("change", () => handleInputChange(element), { once: true });
        });
    
        function handleInputChange(element) {
            console.log(`📝 Field changed: ${element.id}, New Value:`, element.type === "checkbox" ? element.checked : element.value);
        }
    });

    document.getElementById("save-job").addEventListener("click", async function () {
        console.log("🔄 Save button clicked. Collecting all field values...");
    
        let lotName = document.getElementById("job-name")?.value?.trim();
        if (!lotName) {
            console.error("❌ Lot Name is missing. Cannot update Airtable.");
            showToast("❌ Error: Lot Name missing.", "error");
            return;
        }
    
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
                    value = value === "" ? null : parseFloat(value);
                } else {
                    value = input.value.trim();
                    if (value === "") return;
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
            // ✅ Call updateAirtableRecord with lotName
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, lotName, updatedFields);
            console.log("✅ Airtable record updated successfully.");
            
            // ✅ Show toast only after successful save
            showToast("✅ Job details saved successfully!", "success");
    
            // 🔹 Fetch Updated Data and Refresh UI
            setTimeout(async () => {
                const updatedData = await fetchAirtableRecord(window.env.AIRTABLE_TABLE_NAME, lotName);
                console.log("📩 Reloading checkboxes with updated Airtable data:", updatedData);
                populatePrimaryFields(updatedData.fields);
            }, 1000); 
        } catch (error) {
            console.error("❌ Error updating Airtable:", error);
            showToast("❌ Error saving job details. Please try again.", "error");
        }
    });
    
    
    function showToast(message, type = "success") {
        let toast = document.getElementById("toast-message");
    
        // Create toast element if it doesn’t exist
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast-message";
            toast.className = "toast-container";
            document.body.appendChild(toast);
        }
    
        toast.textContent = message;
        toast.classList.add("show");
    
        // Add different styles for error and success
        toast.style.background = type === "error" ? "rgba(200, 0, 0, 0.85)" : "rgba(0, 128, 0, 0.85)";
    
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
     
    
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
    
    async function fetchCurrentImagesFromAirtable(lotName, imageField) {
        console.log("📡 Fetching images for Lot Name:", lotName);
    
        if (!lotName) {
            console.error("❌ Lot Name is missing. Cannot fetch images.");
            return [];
        }
    
        // Use filterByFormula to get the correct record using Lot Name
        const url = `https://api.airtable.com/v0/${window.env.AIRTABLE_BASE_ID}/${window.env.AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(`{Lot Number and Community/Neighborhood} = '${lotName}'`)}&fields[]=${imageField}`;
    
        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                console.error("❌ Error fetching record:", response.status, response.statusText);
                return [];
            }
    
            const data = await response.json();
    
            if (data.records.length === 0) {
                console.warn(`⚠️ No records found for Lot Name: ${lotName}`);
                return [];
            }
    
            // Assuming only one record per lot name exists
            const record = data.records[0];
    
            if (record.fields && record.fields[imageField]) {
                console.log(`✅ Images found for '${lotName}' in field '${imageField}':`, record.fields[imageField]);
                return record.fields[imageField];
            } else {
                console.warn(`⚠️ No images found in field '${imageField}' for '${lotName}'`);
                return [];
            }
        } catch (error) {
            console.error("❌ Error fetching images by Lot Name:", error);
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
    
        let lotName = document.getElementById("job-name")?.value;
        if (!lotName) {
            console.error("❌ ERROR: Lot Name is missing. Cannot upload files.");
            alert("Error: Lot Name not found.");
            return;
        }
    
        let existingImages = await fetchCurrentImagesFromAirtable(lotName, targetField) || [];
        const uploadedUrls = [...existingImages];
    
        for (const file of files) {
            try {
                const dropboxUrl = await uploadFileToDropbox(file);
                if (dropboxUrl) {
                    uploadedUrls.push({ url: dropboxUrl });
                }
            } catch (error) {
                console.error("❌ Error uploading to Dropbox:", error);
            }
        }
    
        console.log("✅ Final file list to save in Airtable:", uploadedUrls);
    
        if (uploadedUrls.length > 0) {
            await updateAirtableRecord(window.env.AIRTABLE_TABLE_NAME, lotName, { [targetField]: uploadedUrls });
    
            // ✅ Refresh only the images after upload
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            await loadImagesForLot(lotName, document.getElementById("field-status")?.value);
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
    
            // 2️⃣ Fetch all subcontractors with offset handling
            let allSubcontractors = await fetchAllSubcontractors(airtableBaseId, subcontractorTableId, branchB);
    
            // 🔹 LOG TOTAL MATCHING SUBCONTRACTORS
            console.log(`✅ Total Subcontractors Matching Branch '${branchB}':`, allSubcontractors.length);
    
            // 3️⃣ Populate the dropdown
            setTimeout(() => {
                populateSubcontractorDropdown(allSubcontractors);
            }, 500); // Waits 500ms to ensure records are fetched
                
        } catch (error) {
            console.error("❌ Error:", error);
        }
    }
    
    // 🔹 Function to fetch all subcontractors (Handles offsets)
    async function fetchAllSubcontractors(baseId, tableId, branchB) {
        let allRecords = [];
        let offset = null;
    
        do {
            let url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(`{Vanir Branch} = '${branchB}'`)}&fields[]=Subcontractor Company Name&fields[]=Vanir Branch`;
            if (offset) {
                url += `&offset=${offset}`;
            }
    
            console.log(`🔗 Fetching Subcontractors URL: ${url}`);
    
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${window.env.AIRTABLE_API_KEY}` }
            });
    
            if (!response.ok) {
                throw new Error(`❌ Error fetching subcontractors: ${response.statusText}`);
            }
    
            const data = await response.json();
            allRecords.push(...data.records);
    
            // If Airtable returns an offset, we need to fetch more records
            offset = data.offset || null;
    
        } while (offset);
    
        console.log(`📦 Retrieved ${allRecords.length} total subcontractors from Airtable.`);
    
        return allRecords.map(record => ({
            name: record.fields['Subcontractor Company Name'] || 'Unnamed Subcontractor',
            vanirOffice: record.fields['Vanir Branch'] || 'Unknown Branch'
        }));
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