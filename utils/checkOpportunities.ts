import axios from "axios";

const CLOSE_API_KEY = "api_4SMlApOm7hT2SqcAfc659U.31zUpEAY6kaoSgiGm2JkUv";
const SOURCE_FIELD_ID = "lcf_pHVheIfAnOIBdoGLVhHxQmav8hxGOb2i6Ar8h2tuV77";

async function checkOpportunities() {
  const url = `https://api.close.com/api/v1/lead/`;
  const params = {
    _limit: 100,
    query: `custom.${SOURCE_FIELD_ID}:"Lead-Maggy"`,
    _fields: 'id,display_name,opportunities'
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
    console.log("\nFirst lead data:");
    console.log(JSON.stringify(response.data.data[0], null, 2));
    
    // Count leads with opportunities
    let leadsWithOpportunities = 0;
    let totalOpportunities = 0;
    
    response.data.data.forEach((lead: any) => {
      if (lead.opportunities && lead.opportunities.length > 0) {
        leadsWithOpportunities++;
        totalOpportunities += lead.opportunities.length;
        console.log(`Lead "${lead.display_name}" has ${lead.opportunities.length} opportunities:`);
        lead.opportunities.forEach((opp: any, index: number) => {
          console.log(`  ${index+1}. ${opp.status_label || 'Unknown status'}, Value: ${opp.value_formatted || opp.value || 'Unknown value'}`);
        });
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`Total leads: ${response.data.data.length}`);
    console.log(`Leads with opportunities: ${leadsWithOpportunities}`);
    console.log(`Total opportunities: ${totalOpportunities}`);
    
    if (leadsWithOpportunities === 0) {
      console.log("\nThere are no opportunities in the fetched leads. This could be because:");
      console.log("1. No opportunities exist for these leads");
      console.log("2. The API isn't returning opportunity data correctly");
      console.log("3. The _fields parameter might need adjustment");
      
      // Let's see what the API is actually returning
      console.log("\nAPI fields returned for first lead:");
      console.log(Object.keys(response.data.data[0]));
    }
    
  } catch (error) {
    console.error("Error fetching leads:", error);
  }
}

checkOpportunities(); 