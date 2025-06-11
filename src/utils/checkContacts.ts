import axios from "axios";

const CLOSE_API_KEY = "api_4SMlApOm7hT2SqcAfc659U.31zUpEAY6kaoSgiGm2JkUv";
const SOURCE_FIELD_ID = "lcf_pHVheIfAnOIBdoGLVhHxQmav8hxGOb2i6Ar8h2tuV77";

async function checkContacts() {
  const url = `https://api.close.com/api/v1/lead/`;
  const params = {
    _limit: 10,
    query: `custom.${SOURCE_FIELD_ID}:"Lead-Maggy"`,
    _fields: 'id,display_name,contacts'
  };

  try {
    console.log("Fetching leads from Close.com API...");
    console.log("Using URL:", url);
    console.log("With params:", JSON.stringify(params, null, 2));
    
    const response = await axios.get(url, {
      params,
      auth: {
        username: CLOSE_API_KEY,
        password: ""
      }
    });

    console.log(`Fetched ${response.data.data.length} leads from Close.com`);
    
    // Log the raw data for the first lead
    console.log("\nFirst lead data:");
    console.log(JSON.stringify(response.data.data[0], null, 2));
    
    // Count leads with contacts
    let leadsWithContacts = 0;
    let totalContacts = 0;
    
    response.data.data.forEach((lead: any) => {
      if (lead.contacts && lead.contacts.length > 0) {
        leadsWithContacts++;
        totalContacts += lead.contacts.length;
        console.log(`\nLead "${lead.display_name}" has ${lead.contacts.length} contacts:`);
        lead.contacts.forEach((contact: any, index: number) => {
          console.log(`  ${index+1}. ${contact.name || 'Unnamed'}`);
          console.log(`     Emails: ${JSON.stringify(contact.emails || [])}`);
          console.log(`     Phones: ${JSON.stringify(contact.phones || [])}`);
        });
      } else {
        console.log(`\nLead "${lead.display_name}" has no contacts`);
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`Total leads: ${response.data.data.length}`);
    console.log(`Leads with contacts: ${leadsWithContacts}`);
    console.log(`Total contacts: ${totalContacts}`);
    
    if (leadsWithContacts === 0) {
      console.log("\nThere are no contacts in the fetched leads. This could be because:");
      console.log("1. No contacts exist for these leads");
      console.log("2. The API isn't returning contact data correctly");
      console.log("3. The _fields parameter might need adjustment");
    }
    
  } catch (error: any) {
    console.error("Error fetching leads:", error?.message || 'Unknown error');
  }
}

checkContacts(); 