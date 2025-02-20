const apiKey = 'patXTUS9m8os14OO1.6a81b7bc4dd88871072fe71f28b568070cc79035bc988de3d4228d52239c8238';
const warrantiesBaseId = 'appO21PVRA4Qa087I';
const warrantiesTableId = 'tbl6EeKPsNuEvt5yJ';
const vendorsBaseId = 'appeNSp44fJ8QYeY5';
const vendorsTableId = 'tblLEYdDi0hfD9fT3';

// Function to fetch all records from the Warranties table
async function fetchAllWarrantyRecords() {
    const url = `https://api.airtable.com/v0/${warrantiesBaseId}/${warrantiesTableId}`;
    const options = {
        headers: { Authorization: `Bearer ${apiKey}` }
    };
    
    let records = [];
    let offset = null;

    do {
        const response = await fetch(`${url}${offset ? `?offset=${offset}` : ''}`, options);
        const data = await response.json();

        if (data.records) {
            records.push(...data.records);
        }

        offset = data.offset; // Set the next offset if available
    } while (offset);

    return records;
}

// Function to fetch vendor data with emails from the Vendor Locations table
async function fetchVendorsWithEmails() {
    const url = `https://api.airtable.com/v0/${vendorsBaseId}/${vendorsTableId}`;
    const options = {
        headers: { Authorization: `Bearer ${apiKey}` }
    };
    
    let vendors = [];
    let offset = null;

    do {
        const response = await fetch(`${url}${offset ? `?offset=${offset}` : ''}`, options);
        const data = await response.json();

        if (data.records) {
            vendors.push(...data.records.map(record => ({
                name: record.fields['Name'],
                email: record.fields['Email'],
                secondaryEmail: record.fields['Secondary Email'],
                returnEmail: record.fields['Return Email'],
                secondaryReturnEmail: record.fields['Secondary Return Email']
            })));
        }

        offset = data.offset;
    } while (offset);

    return vendors;
}

// Function to delay execution for rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to update the Warranties table with matched email information, with rate limiting
async function updateWarrantyEmails() {
    console.log("Starting to update Warranties with vendor email data...");
    const warranties = await fetchAllWarrantyRecords();
    const vendors = await fetchVendorsWithEmails();

    const vendorMap = vendors.reduce((map, vendor) => {
        map[vendor.name] = vendor;
        return map;
    }, {});

    for (const warranty of warranties) {
        const vendorName = warranty.fields['Material Vendor'];
        const matchedVendor = vendorMap[vendorName];

        let fieldsToUpdate = {};

        if (matchedVendor) {
            if (warranty.fields['Vendor Email'] !== matchedVendor.email) {
                fieldsToUpdate['Vendor Email'] = matchedVendor.email || '';
            }
            if (warranty.fields['Vendor Secondary Email'] !== matchedVendor.secondaryEmail) {
                fieldsToUpdate['Vendor Secondary Email'] = matchedVendor.secondaryEmail || '';
            }
            if (warranty.fields['Vendor Return Email'] !== matchedVendor.returnEmail) {
                fieldsToUpdate['Vendor Return Email'] = matchedVendor.returnEmail || '';
            }
            if (warranty.fields['Vendor Secondary Return Email'] !== matchedVendor.secondaryReturnEmail) {
                fieldsToUpdate['Vendor Secondary Return Email'] = matchedVendor.secondaryReturnEmail || '';
            }
        }

        if (Object.keys(fieldsToUpdate).length > 0) {
            try {
                const url = `https://api.airtable.com/v0/${warrantiesBaseId}/${warrantiesTableId}/${warranty.id}`;
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fields: fieldsToUpdate })
                });
            
                if (!response.ok) {
                    console.error(`Failed to update warranty record: ${warranty.id}`);
                } else {
                    console.log(`Successfully updated warranty record: ${warranty.id}`);
                }
                await delay(210); 
            } catch (error) {
                console.error(`Error updating warranty record: ${warranty.id}`, error);
            }
        }
    }
}

// Execute the update function with rate limiting
updateWarrantyEmails().then(() => {
    console.log("Email update process completed.");
}).catch(error => {
    console.error("Error during email update process:", error);
});