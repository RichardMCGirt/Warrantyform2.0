document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("id");
    const airtableApiKey = window.env.AIRTABLE_API_KEY;
    const airtableBaseId = window.env.AIRTABLE_BASE_ID;
    const airtableTableName = window.env.AIRTABLE_TABLE_NAME;
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}/${recordId}`;

    if (!recordId) {
        alert("No job selected.");
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${airtableApiKey}` }
        });

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }

        const data = await response.json();
        const job = data.fields;

        // Populate form fields
        document.getElementById("job-name").value = job["Lot Number and Community/Neighborhood"] || "";
        document.getElementById("field-tech").value = job["field tech"] || "";
        document.getElementById("address").value = job["Address"] || "";
        document.getElementById("homeowner-name").value = job["Homeowner Name"] || "";
        document.getElementById("contact-email").value = job["Contact Email"] || "";
        document.getElementById("description").value = job["Description of Issue"] || "";
        document.getElementById("dow-completed").value = job["DOW to be Completed"] || "";
    } catch (error) {
        console.error("Error loading job details:", error);
    }

    // Save job details
    document.getElementById("save-job").addEventListener("click", async function () {
        const updatedFields = {
            "Contact Email": document.getElementById("contact-email").value,
            "Description of Issue": document.getElementById("description").value,
            "DOW to be Completed": document.getElementById("dow-completed").value
        };

        try {
            const response = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${airtableApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ fields: updatedFields })
            });

            if (!response.ok) {
                throw new Error(`Error updating data: ${response.statusText}`);
            }

            alert("Changes saved successfully!");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Error saving job details:", error);
        }
    });
});
