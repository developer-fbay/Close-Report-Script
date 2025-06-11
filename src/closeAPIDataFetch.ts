import axios from "axios";
import { config } from "./config";

const CLOSE_API_KEY = config.closeApiKey

const SOURCE_FIELD_ID = config.sourceFieldId

interface CloseLead {
  display_name: string;
  created_by_name: string;
  custom: {
    [key: string]: any;
  };
  date_created: string;
  date_updated: string;
  html_url: string;
  status_label: string;
  opportunities: any[];
  contacts: any[];
  id: string; // Adding id to fetch notes
}

interface Note {
  id: string;
  note: string;
  date_created: string;
  created_by_name: string;
}

interface Task {
  id: string;
  text: string;
  date_created: string;
  date: string;
  is_complete: boolean;
  assigned_to_name: string;
}

export interface TransformedLead {
  displayName: string;
  createdByName: string;
  date_created: string;
  date_updated: string;
  html_url: string;
  status_label: string;
  opportunities: any[];
  contacts: any[];
  date_won?: string;
  date_lost?: string;
  confidence?: number;
  customFields: {
    [key: string]: any;
  };
  notes?: Note[]; // Add notes field
  tasks?: Task[]; // Add tasks field
}

function transformLeadData(leads: CloseLead[]): TransformedLead[] {
  return leads.map(lead => {
    const transformedLead: TransformedLead = {
      "displayName": lead.display_name,
      "createdByName": lead.created_by_name,
      "date_created": lead.date_created,
      "date_updated": lead.date_updated,
      "html_url": lead.html_url,
      "status_label": lead.status_label,
      "opportunities": lead.opportunities || [],
      "contacts": lead.contacts || [],
      "customFields": {},
      "notes": [],
      "tasks": []
    };
    
    // Add all custom fields dynamically
    if (lead.custom) {
      transformedLead.customFields = { ...lead.custom };
    }
    
    return transformedLead;
  });
}

async function fetchNotesForLead(leadId: string): Promise<Note[]> {
  const url = `https://api.close.com/api/v1/activity/note/`;
  const params = {
    _limit: 3, // Fetch only the 3 most recent notes
    lead_id: leadId,
    _order_by: '-date_created' // Order by date created descending (newest first)
  };

  try {
    const response = await axios.get(url, {
      params,
      auth: {
        username: CLOSE_API_KEY,
        password: ""
      }
    });
    
    // Transform notes to simpler format
    return response.data.data.map((note: any) => ({
      id: note.id,
      note: note.note || note.note_html || '',
      date_created: note.date_created,
      created_by_name: note.created_by_name || 'Unknown'
    }));
  } catch (error) {
    console.log(`Error fetching notes for lead ${leadId}:`, error);
    return [];
  }
}

// Fetch tasks for a lead
async function fetchTasksForLead(leadId: string): Promise<Task[]> {
  const url = `https://api.close.com/api/v1/task/`;
  const params = {
    _limit: 5, // Fetch the 5 most recent tasks
    lead_id: leadId,
    _order_by: '-date_created' // Order by date created descending (newest first)
  };

  try {
    const response = await axios.get(url, {
      params,
      auth: {
        username: CLOSE_API_KEY,
        password: ""
      }
    });
    
    // Transform tasks to simpler format
    return response.data.data.map((task: any) => ({
      id: task.id,
      text: task.text || '',
      date_created: task.date_created,
      date: task.due_date || '',
      is_complete: task.is_complete || false,
      assigned_to_name: task.assigned_to_name || 'Unassigned'
    }));
  } catch (error) {
    console.log(`Error fetching tasks for lead ${leadId}:`, error);
    return [];
  }
}

async function fetchLeadsBySource(): Promise<TransformedLead[]> {
  const url = `https://api.close.com/api/v1/lead/`
  const params = {
    _limit: 100,
    query: `custom.${SOURCE_FIELD_ID}:"Lead-Maggy"`,
    _fields: 'id,display_name,created_by_name,custom,date_created,date_updated,html_url,status_label,opportunities,contacts'
  }

  try {
    console.log("Fetching leads from Close.com API...");
    const response = await axios.get(url, {
      params,
      auth: {
        username: CLOSE_API_KEY,
        password: ""
      }
    });
    
    const transformedData = transformLeadData(response.data.data);
    console.log(`Fetched ${transformedData.length} leads with ${Object.keys(transformedData[0]?.customFields || {}).length} custom fields`);
    
    // Fetch notes for each lead
    console.log("Fetching notes and tasks for each lead...");
    const leadsWithData = await Promise.all(
      transformedData.map(async (lead, index) => {
        // Get lead ID from the original data
        const leadId = response.data.data[index].id;
        
        // Fetch notes and tasks for this lead in parallel
        const [notes, tasks] = await Promise.all([
          fetchNotesForLead(leadId),
          fetchTasksForLead(leadId)
        ]);
        
        // Add notes and tasks to the lead
        return {
          ...lead,
          notes,
          tasks
        };
      })
    );
    
    console.log(`Added notes and tasks to ${leadsWithData.length} leads`);
    return leadsWithData;
  } catch (error) {
    console.log("Error Fetching Leads: ", error);
    return [];
  }
}

export { fetchLeadsBySource };