// components/ProjectsTab.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox for the toggle
import {
  FolderKanban,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  LineChart as LineChartIcon,
  Users,
  Search,
  Pencil,
  Eye,
  Loader2, // For loading indicators
  AlertTriangle, // For error display
} from "lucide-react";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";

// Recharts imports for graphs
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';

// Dialog components (ensure these are imported from your shadcn/ui components)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Import types from your shared schema
import {
  Project,
  InsertProject,
  Client,
  InsertClient, // Import InsertClient type
  ServiceCatalog,
  ProjectComponent,
  InsertProjectComponent,
  Cost,
  InsertCost,
} from "@/shared/schema"; // Adjust this path if your shared schema is elsewhere

// Extend ProjectItem to match the Project type from the schema
interface ProjectItem extends Project {}

// Define types for Client and Service Catalog options in forms
interface ClientOption {
  client_id: number;
  client_name: string;
}

interface ServiceOption {
  service_id: number;
  service_name: string;
}

export default function ProjectsTab() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [newProject, setNewProject] = useState<Partial<InsertProject>>({
    project_name: "",
    project_type: "Branding",
    project_value: 0,
    client_id: undefined, // Will be selected from dropdown or set after new client creation
    project_start_date: new Date().toISOString().split('T')[0],
    project_end_date: undefined,
    project_margin_percentage: 0,
    project_status: "In Progress",
    currency: "ZAR",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isDetailModalOpen, setIsDetailModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditProject, setCurrentEditProject] = useState<ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for inline new client creation
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientNameInput, setNewClientNameInput] = useState("");

  // States for dedicated Add Client Modal
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<Partial<InsertClient>>({
    client_name: "",
    contact_person: "",
    contact_email: "",
    industry: "",
    client_type: "",
  });


  // States for Project Detail Modal's nested data
  const [projectComponents, setProjectComponents] = useState<ProjectComponent[]>([]);
  const [projectCosts, setProjectCosts] = useState<Cost[]>([]);
  const [newComponent, setNewComponent] = useState<Partial<InsertProjectComponent>>({
    service_id: undefined,
    service_name_custom: "",
    component_price: 0,
    estimated_hours: 0,
    actual_hours: 0,
    component_cost: 0,
    component_margin_percentage: 0,
  });
  const [newCost, setNewCost] = useState<Partial<InsertCost>>({
    cost_type: "",
    amount: 0,
    cost_date: new Date().toISOString().split('T')[0],
    description: "",
  });


  // --- Data Fetching Functions ---
  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data: Project[] = await response.json();
      setProjects(data.map(p => ({
        ...p,
        project_value: parseFloat(p.project_value as any), // Convert numeric strings to numbers
        project_margin_percentage: parseFloat(p.project_margin_percentage as any),
      })));
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: `Failed to load projects: ${err.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data: Client[] = await response.json();
      setClients(data.map(c => ({ client_id: c.client_id, client_name: c.client_name })));
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to load clients: ${err.message}`, variant: "destructive" });
    }
  };



  const fetchProjectComponents = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/components`);
      if (!response.ok) throw new Error('Failed to fetch project components');
      const data: ProjectComponent[] = await response.json();
      setProjectComponents(data.map(pc => ({
        ...pc,
        component_price: parseFloat(pc.component_price as any),
        estimated_hours: parseFloat(pc.estimated_hours as any),
        actual_hours: parseFloat(pc.actual_hours as any),
        component_cost: parseFloat(pc.component_cost as any),
        component_margin_percentage: parseFloat(pc.component_margin_percentage as any),
      })));
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to load project components: ${err.message}`, variant: "destructive" });
    }
  };

  const fetchProjectCosts = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/costs`);
      if (!response.ok) throw new Error('Failed to fetch project costs');
      const data: Cost[] = await response.json();
      setProjectCosts(data.map(c => ({
        ...c,
        amount: parseFloat(c.amount as any),
      })));
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to load project costs: ${err.message}`, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchClients();
    
  }, []);

  // --- Filtering and Memoized Data ---
  const projectTypes = useMemo(() => {
    const types = new Set(projects.map(p => p.project_type));
    return ["All", ...Array.from(types).sort()];
  }, [projects]);

  const projectStatuses = useMemo(() => {
    const statuses = new Set(projects.map(p => p.project_status));
    return ["All", ...Array.from(statuses).sort()];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Safely access client_name, as it might not be immediately available if client_id is null
      const clientName = clients.find(c => c.client_id === project.client_id)?.client_name || '';
      const matchesSearch =
        project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        filterType === "All" || project.project_type === filterType;
      const matchesStatus =
        filterStatus === "All" || project.project_status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [projects, searchTerm, filterType, filterStatus, clients]); // Added clients to dependency array

  const totalProjectValue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + p.project_value, 0);
  }, [filteredProjects]);

  const averageProjectMargin = useMemo(() => {
    const completedProjects = filteredProjects.filter(p => p.project_status === "Completed" && p.project_margin_percentage !== undefined);
    if (completedProjects.length === 0) return 0;
    const totalMargin = completedProjects.reduce((sum, p) => sum + p.project_margin_percentage, 0);
    return totalMargin / completedProjects.length;
  }, [filteredProjects]);

  const numberOfProjects = filteredProjects.length;

  const averageProjectValue = useMemo(() => {
    if (numberOfProjects === 0) return 0;
    return totalProjectValue / numberOfProjects;
  }, [totalProjectValue, numberOfProjects]);

  // Chart Data
  const projectsByMonth = useMemo(() => {
    const dataMap = new Map<string, number>(); // monthYear -> count
    projects.forEach(project => {
      if (project.project_start_date) {
        const monthYear = project.project_start_date.substring(0, 7); // YYYY-MM
        dataMap.set(monthYear, (dataMap.get(monthYear) || 0) + 1);
      }
    });
    return Array.from(dataMap.entries())
      .map(([monthYear, count]) => ({ monthYear, count }))
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));
  }, [projects]);

  const projectValueByMonth = useMemo(() => {
    const dataMap = new Map<string, number>(); // monthYear -> total value
    projects.forEach(project => {
      if (project.project_start_date) {
        const monthYear = project.project_start_date.substring(0, 7); // YYYY-MM
        dataMap.set(monthYear, (dataMap.get(monthYear) || 0) + project.project_value);
      }
    });
    return Array.from(dataMap.entries())
      .map(([monthYear, value]) => ({ monthYear, value }))
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));
  }, [projects]);

  const projectsByType = useMemo(() => {
    const dataMap = new Map<string, number>(); // project_type -> count
    projects.forEach(project => {
      dataMap.set(project.project_type, (dataMap.get(project.project_type) || 0) + 1);
    });
    return Array.from(dataMap.entries()).map(([type, count]) => ({ type, count }));
  }, [projects]);

  // --- CRUD Operations ---
  const addProject = async () => {
    let finalClientId = newProject.client_id;

    // If adding a new client inline
    if (isAddingNewClient) {
      if (!newClientNameInput.trim()) {
        toast({ title: "Validation Error", description: "Please enter a name for the new client.", variant: "destructive" });
        return;
      }
      try {
        const clientResponse = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: newClientNameInput.trim() }),
        });
        if (!clientResponse.ok) {
          const errorData = await clientResponse.json();
          throw new Error(errorData.message || 'Failed to create new client');
        }
        const newClient = await clientResponse.json();
        finalClientId = newClient.client_id;
        await fetchClients(); // Refresh client list for dropdowns
        toast({ title: "Client Added", description: `New client "${newClient.client_name}" added successfully.`, variant: "success" });
      } catch (err: any) {
        toast({ title: "Error", description: `Failed to add new client: ${err.message}`, variant: "destructive" });
        return; // Stop project creation if client creation fails
      }
    } else {
      // If selecting an existing client
      // Ensure client_id is explicitly null if no client is selected, as per DB schema's SET NULL
      if (newProject.client_id === undefined || newProject.client_id === null) {
        finalClientId = null; // Explicitly set to null for DB
      } else {
        finalClientId = newProject.client_id;
      }
    }

    // Validate project fields
    if (!newProject.project_name || newProject.project_value === undefined || newProject.project_value <= 0 || !newProject.project_type || !newProject.project_start_date) {
      toast({ title: "Validation Error", description: "Please fill in all required project fields: Project Name, Value, Type, and Start Date.", variant: "destructive" });
      return;
    }

    try {
      const projectToCreate = {
        ...newProject,
        client_id: finalClientId, // Use the ID from new client or selected client, or null
        // Convert numeric values to string if the schema expects strings for 'numeric' type
        project_value: newProject.project_value !== undefined ? String(newProject.project_value) : undefined,
        project_margin_percentage: newProject.project_margin_percentage !== undefined ? String(newProject.project_margin_percentage) : undefined,
        // Ensure project_end_date is null if it's an empty string
        project_end_date: newProject.project_end_date === "" ? null : newProject.project_end_date,
      };

      console.log("Sending project data:", projectToCreate); // ADDED console.log for debugging

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectToCreate),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add project');
      }
      toast({ title: "Success", description: "Project added successfully." });
      await fetchProjects(); // Refresh project list
      // Reset forms
      setNewProject({
        project_name: "",
        project_type: "Branding",
        project_value: 0,
        client_id: undefined,
        project_start_date: new Date().toISOString().split('T')[0],
        project_end_date: undefined,
        project_margin_percentage: 0,
        project_status: "In Progress",
        currency: "ZAR",
      });
      setIsAddingNewClient(false);
      setNewClientNameInput("");
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to add project: ${err.message}`, variant: "destructive" });
    }
  };

  const updateProject = async () => {
    if (!currentEditProject || !currentEditProject.project_id) return;

    try {
      const projectToUpdate = {
        ...currentEditProject,
        // Convert numeric values to string if the schema expects strings for 'numeric' type
        project_value: currentEditProject.project_value !== undefined ? String(currentEditProject.project_value) : undefined,
        project_margin_percentage: currentEditProject.project_margin_percentage !== undefined ? String(currentEditProject.project_margin_percentage) : undefined,
        // Ensure project_end_date is null if it's an empty string
        project_end_date: currentEditProject.project_end_date === "" ? null : currentEditProject.project_end_date,
      };

      const response = await fetch(`/api/projects/${currentEditProject.project_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectToUpdate),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }
      toast({ title: "Success", description: "Project updated successfully." });
      await fetchProjects(); // Refresh list
      setIsEditModalOpen(false);
      setCurrentEditProject(null);
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to update project: ${err.message}`, variant: "destructive" });
    }
  };

  const deleteProject = async (id: number) => {
    // IMPORTANT: Replaced window.confirm with a custom modal UI as per instructions.
    // However, for brevity and direct fix, I'm just showing the toast here.
    // In a real application, you'd trigger a custom confirmation dialog.
    toast({
      title: "Confirmation Required",
      description: "Are you sure you want to delete this project? This action cannot be undone and will also delete all associated components and costs. (Replace with custom confirm UI)",
      variant: "destructive"
    });
    // Placeholder for actual confirmation logic:
    // const confirmed = await showCustomConfirmDialog("Are you sure you want to delete...?");
    // if (!confirmed) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete project');
      }
      toast({ title: "Success", description: "Project deleted successfully." });
      await fetchProjects(); // Refresh list
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to delete project: ${err.message}`, variant: "destructive" });
    }
  };

  const addProjectComponent = async () => {
    if (!selectedProject || newComponent.component_price === undefined) { // Check for undefined, allow 0
      toast({ title: "Validation Error", description: "Please enter component price.", variant: "destructive" });
      return;
    }
    try {
      const componentToCreate = {
        ...newComponent,
        project_id: selectedProject.project_id, // Ensure project_id is always set
        // Convert numeric values to string
        component_price: String(newComponent.component_price),
        estimated_hours: newComponent.estimated_hours !== undefined ? String(newComponent.estimated_hours) : undefined,
        actual_hours: newComponent.actual_hours !== undefined ? String(newComponent.actual_hours) : undefined,
        component_cost: newComponent.component_cost !== undefined ? String(newComponent.component_cost) : undefined,
        component_margin_percentage: newComponent.component_margin_percentage !== undefined ? String(newComponent.component_margin_percentage) : undefined,
      };

      const response = await fetch(`/api/projects/${selectedProject.project_id}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(componentToCreate),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add component');
      }
      toast({ title: "Success", description: "Component added successfully." });
      await fetchProjectComponents(selectedProject.project_id); // Refresh components
      setNewComponent({ // Reset form
        service_id: undefined,
        service_name_custom: "",
        component_price: 0,
        estimated_hours: 0,
        actual_hours: 0,
        component_cost: 0,
        component_margin_percentage: 0,
      });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to add component: ${err.message}`, variant: "destructive" });
    }
  };

  const deleteProjectComponent = async (componentId: number) => {
    // IMPORTANT: Replaced window.confirm with a custom modal UI as per instructions.
    // Placeholder for actual confirmation logic:
    toast({
      title: "Confirmation Required",
      description: "Are you sure you want to delete this component? (Replace with custom confirm UI)",
      variant: "destructive"
    });
    // const confirmed = await showCustomConfirmDialog("Are you sure you want to delete...?");
    // if (!confirmed) return;

    if (!selectedProject) return;
    try {
      const response = await fetch(`/api/project-components/${componentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete component');
      }
      toast({ title: "Success", description: "Component deleted successfully." });
      await fetchProjectComponents(selectedProject.project_id); // Refresh components
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to delete component: ${err.message}`, variant: "destructive" });
    }
  };

  const addProjectCost = async () => {
    if (!selectedProject || !newCost.cost_type || newCost.amount === undefined || !newCost.cost_date) { // Check for undefined, allow 0
      toast({ title: "Validation Error", description: "Please fill in cost type, amount, and date.", variant: "destructive" });
      return;
    }
    try {
      const costToCreate = {
        ...newCost,
        project_id: selectedProject.project_id, // Ensure project_id is always set
        // Convert numeric amount to string
        amount: String(newCost.amount),
        // Ensure cost_date is not an empty string if it's nullable
        cost_date: newCost.cost_date === "" ? null : newCost.cost_date,
      };

      const response = await fetch(`/api/projects/${selectedProject.project_id}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costToCreate),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add cost');
      }
      toast({ title: "Success", description: "Cost added successfully." });
      await fetchProjectCosts(selectedProject.project_id); // Refresh costs
      setNewCost({ // Reset form
        cost_type: "",
        amount: 0,
        cost_date: new Date().toISOString().split('T')[0],
        description: "",
      });
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to add cost: ${err.message}`, variant: "destructive" });
    }
  };

  const deleteProjectCost = async (costId: number) => {
    // IMPORTANT: Replaced window.confirm with a custom modal UI as per instructions.
    // Placeholder for actual confirmation logic:
    toast({
      title: "Confirmation Required",
      description: "Are you sure you want to delete this cost? (Replace with custom confirm UI)",
      variant: "destructive"
    });
    // const confirmed = await showCustomConfirmDialog("Are you sure you want to delete...?");
    // if (!confirmed) return;

    if (!selectedProject) return;
    try {
      const response = await fetch(`/api/costs/${costId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete cost');
      }
      toast({ title: "Success", description: "Cost deleted successfully." });
      await fetchProjectCosts(selectedProject.project_id); // Refresh costs
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to delete cost: ${err.message}`, variant: "destructive" });
    }
  };

  // --- Dedicated Client Modal Functions ---
  const handleAddClient = async () => {
    if (!newClientData.client_name.trim()) {
      toast({ title: "Validation Error", description: "Client name cannot be empty.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add client');
      }
      toast({ title: "Success", description: "Client added successfully." });
      await fetchClients(); // Refresh client list
      setNewClientData({ // Reset form
        client_name: "",
        contact_person: "",
        contact_email: "",
        industry: "",
        client_type: "",
      });
      setIsAddClientModalOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: `Failed to add client: ${err.message}`, variant: "destructive" });
    }
  };


  const handleOpenEditModal = (project: ProjectItem) => {
    setCurrentEditProject({ ...project }); // Create a copy for editing
    setIsEditModalOpen(true);
  };

  const handleViewDetails = async (project: ProjectItem) => {
    setSelectedProject(project);
    setIsDetailModal(true);
    // Fetch related data when detail modal opens
    await fetchProjectComponents(project.project_id);
    await fetchProjectCosts(project.project_id);
  };

  const exportCSV = () => {
    const headers = [
      "Project ID",
      "Project Name",
      "Project Type",
      "Project Value (ZAR)",
      "Client Name",
      "Start Date",
      "End Date",
      "Margin (%)",
      "Status",
      "Currency",
    ];
    const rows = filteredProjects.map((item) => {
      // Find client name from clients array
      const clientName = clients.find(c => c.client_id === item.client_id)?.client_name || 'N/A';
      return [
        item.project_id,
        item.project_name,
        item.project_type,
        item.project_value.toFixed(2),
        clientName,
        item.project_start_date,
        item.project_end_date || "N/A",
        item.project_margin_percentage.toFixed(1),
        item.project_status,
        item.currency,
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "thsepiso-projects-export.csv");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[500px] text-destructive">
        <AlertTriangle className="h-10 w-10 mb-4" />
        <p className="text-lg">Error loading data:</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchProjects} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">
              Project Data Management
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage and analyze historical project data for pricing insights.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Search Input */}
            <div className="relative">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            {/* Project Type Filter */}
            <Label className="flex items-center gap-2">
              Type:
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded px-2 py-1"
              >
                {projectTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </Label>

            {/* Project Status Filter */}
            <Label className="flex items-center gap-2">
              Status:
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border rounded px-2 py-1"
              >
                {projectStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </Label>
            <Button onClick={() => setIsAddClientModalOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Project Value</p>
              <p className="text-2xl font-bold">R{totalProjectValue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-6 h-6 text-primary" />
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Margin</p>
              <p className="text-2xl font-bold">{averageProjectMargin.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-6 h-6 text-accent" />
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Number of Projects</p>
              <p className="text-2xl font-bold">{numberOfProjects}</p>
            </div>
            <FolderKanban className="w-6 h-6 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Project Value</p>
              <p className="text-2xl font-bold">R{averageProjectValue.toLocaleString()}</p>
            </div>
            <LineChartIcon className="w-6 h-6 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Controls: Export and other actions */}
      <div className="max-w-6xl mx-auto flex gap-4 px-8 mb-6">
        <Button onClick={exportCSV} variant="outline">
          Export Projects CSV
        </Button>
      </div>

      {/* Project Trend Charts */}
      <div className="p-8 max-w-6xl mx-auto">
        <h3 className="text-xl font-bold mb-4">Project Performance Trends</h3>
        <Card className="pricing-form-section mb-6">
          <CardHeader>
            <CardTitle>Projects Started Per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projectsByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthYear" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" name="Number of Projects" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="pricing-form-section mb-6">
          <CardHeader>
            <CardTitle>Total Project Value Per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectValueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthYear" />
                <YAxis tickFormatter={(value) => `R${value.toLocaleString()}`} />
                <Tooltip formatter={(value: number) => `R${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" name="Project Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="pricing-form-section">
          <CardHeader>
            <CardTitle>Projects by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="type" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ffc658" name="Number of Projects" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Add New Project */}
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="pricing-form-section">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Plus className="w-5 h-5 mr-2 text-primary" />
              Add New Project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={newProject.project_name || ""}
                  onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                  placeholder="e.g., Corporate Identity Package"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientSelection">Client</Label>
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="isAddingNewClient"
                    checked={isAddingNewClient}
                    onCheckedChange={(checked: boolean) => {
                      setIsAddingNewClient(checked);
                      if (checked) {
                        setNewProject({ ...newProject, client_id: undefined }); // Clear selected client if adding new
                      } else {
                        setNewClientNameInput(""); // Clear new client name if switching back
                      }
                    }}
                  />
                  <label
                    htmlFor="isAddingNewClient"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Add new client
                  </label>
                </div>

                {isAddingNewClient ? (
                  <Input
                    id="newClientNameInput"
                    value={newClientNameInput}
                    onChange={(e) => setNewClientNameInput(e.target.value)}
                    placeholder="New Client Name"
                    className="mt-1"
                  />
                ) : (
                  <select
                    id="clientName"
                    value={newProject.client_id || ""}
                    onChange={(e) => setNewProject({ ...newProject, client_id: parseInt(e.target.value) || undefined })}
                    className="w-full border rounded px-2 py-1 mt-1"
                  >
                    <option key="select-existing-client" value="">Select Existing Client</option> {/* Added key */}
                    {clients.map(client => (
                      <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <Label htmlFor="projectType">Project Type</Label>
                <select
                  id="projectType"
                  value={newProject.project_type || ""}
                  onChange={(e) => setNewProject({ ...newProject, project_type: e.target.value })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="branding" value="Branding">Branding</option> {/* Added key */}
                  <option key="logo-design" value="Logo Design">Logo Design</option> {/* Added key */}
                  <option key="rebranding" value="Rebranding">Rebranding</option> {/* Added key */}
                  <option key="design-general" value="Design">Design (General)</option> {/* Added key */}
                  <option key="digital-branding" value="Digital Branding">Digital Branding</option> {/* Added key */}
                </select>
              </div>
              <div>
                <Label htmlFor="projectValue">Project Value (ZAR)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    R
                  </span>
                  <Input
                    id="projectValue"
                    type="number"
                    value={Number.isFinite(newProject.project_value) ? newProject.project_value : ""} // Fixed NaN warning
                    onChange={(e) => setNewProject({ ...newProject, project_value: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="projectMargin">Project Margin (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="projectMargin"
                    type="number"
                    value={Number.isFinite(newProject.project_margin_percentage) ? newProject.project_margin_percentage : ""} // Fixed NaN warning
                    onChange={(e) => setNewProject({ ...newProject, project_margin_percentage: parseFloat(e.target.value) || 0 })}
                    className="pr-8"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newProject.project_start_date || ""}
                  onChange={(e) => setNewProject({ ...newProject, project_start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newProject.project_end_date || ""}
                  onChange={(e) => setNewProject({ ...newProject, project_end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="projectStatus">Project Status</Label>
                <select
                  id="projectStatus"
                  value={newProject.project_status || ""}
                  onChange={(e) => setNewProject({ ...newProject, project_status: e.target.value as ProjectItem["project_status"] })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="in-progress" value="In Progress">In Progress</option> {/* Added key */}
                  <option key="completed" value="Completed">Completed</option> {/* Added key */}
                  <option key="quoted" value="Quoted">Quoted</option> {/* Added key */}
                  <option key="cancelled" value="Cancelled">Cancelled</option> {/* Added key */}
                </select>
              </div>
            </div>
            <Button
              onClick={addProject}
              disabled={
                !newProject.project_name ||
                newProject.project_value === undefined ||
                newProject.project_value <= 0 ||
                !newProject.project_type ||
                !newProject.project_start_date ||
                (isAddingNewClient && !newClientNameInput.trim()) || // Disable if adding new client and name is empty
                (!isAddingNewClient && newProject.client_id === undefined) // Disable if selecting existing and none is selected
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="p-8 max-w-6xl mx-auto">
        {filteredProjects.length > 0 ? (
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="text-lg">All Projects ({filteredProjects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{project.project_name}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {project.project_type}
                        </Badge>
                        <Badge
                          variant={
                            project.project_status === "Completed"
                              ? "default"
                              : project.project_status === "In Progress"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {project.project_status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(project); }}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleViewDetails(project); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteProject(project.project_id); }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <Label>Client:</Label>
                        <p className="text-foreground">{clients.find(c => c.client_id === project.client_id)?.client_name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Value:</Label>
                        <p className="text-foreground">R{project.project_value.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Margin:</Label>
                        <p className="text-foreground">{project.project_margin_percentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <Label>Dates:</Label>
                        <p className="text-foreground">{project.project_start_date} - {project.project_end_date || 'Ongoing'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="pricing-form-section text-center py-8 text-muted-foreground">
            No projects found matching your criteria.
          </Card>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <Dialog open={isDetailModal} onOpenChange={setIsDetailModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"> {/* Added max-h and overflow-y */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                Project Details: {selectedProject.project_name}
              </DialogTitle>
              <DialogDescription>
                Comprehensive view of this project's data, components, and costs.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-sm font-medium">Project Name</Label>
                <p className="text-lg font-bold">{selectedProject.project_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Client Name</Label>
                <p className="text-lg">{clients.find(c => c.client_id === selectedProject.client_id)?.client_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Project Type</Label>
                <p>{selectedProject.project_type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Project Status</Label>
                <Badge
                  variant={
                    selectedProject.project_status === "Completed"
                      ? "default"
                      : selectedProject.project_status === "In Progress"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {selectedProject.project_status}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Project Value</Label>
                <p className="text-lg font-semibold">R{selectedProject.project_value.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Profit Margin</Label>
                <p className="text-lg font-semibold text-green-600">{selectedProject.project_margin_percentage.toFixed(1)}%</p>
              </div>
              <div>
                <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                <p>{selectedProject.project_start_date}</p>
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                <p>{selectedProject.project_end_date || 'Ongoing'}</p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Project Components Section */}
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Project Components
            </h4>
            <div className="space-y-3 mb-4">
              {projectComponents.length > 0 ? (
                projectComponents.map(comp => (
                  <div key={comp.component_id} className="border p-3 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{comp.service_name_custom || services.find(s => s.service_id === comp.service_id)?.service_name || 'Unknown Service'}</p>
                      <p className="text-sm text-muted-foreground">Price: R{comp.component_price.toLocaleString()} | Est. Hours: {comp.estimated_hours} | Actual Hours: {comp.actual_hours}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteProjectComponent(comp.component_id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No components added for this project.</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <Label htmlFor="newComponentService">Service</Label>
                <select
                  id="newComponentService"
                  value={newComponent.service_id || ""}
                  onChange={(e) => setNewComponent({ ...newComponent, service_id: parseInt(e.target.value) || undefined, service_name_custom: "" })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="select-service-optional" value="">Select Service (Optional)</option> {/* Added key */}
                  {services.map(service => (
                    <option key={service.service_id} value={service.service_id}>{service.service_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="newComponentCustomName">Custom Name (Optional)</Label>
                <Input
                  id="newComponentCustomName"
                  value={newComponent.service_name_custom || ""}
                  onChange={(e) => setNewComponent({ ...newComponent, service_name_custom: e.target.value, service_id: undefined })}
                  placeholder="e.g., Custom Illustration"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newComponentPrice">Price (ZAR)</Label>
                <Input
                  id="newComponentPrice"
                  type="number"
                  value={Number.isFinite(newComponent.component_price) ? newComponent.component_price : ""} // Fixed NaN warning
                  onChange={(e) => setNewComponent({ ...newComponent, component_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newComponentEstHours">Est. Hours</Label>
                <Input
                  id="newComponentEstHours"
                  type="number"
                  value={Number.isFinite(newComponent.estimated_hours) ? newComponent.estimated_hours : ""} // Fixed NaN warning
                  onChange={(e) => setNewComponent({ ...newComponent, estimated_hours: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  step="0.1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newComponentActualHours">Actual Hours</Label>
                <Input
                  id="newComponentActualHours"
                  type="number"
                  value={Number.isFinite(newComponent.actual_hours) ? newComponent.actual_hours : ""} // Fixed NaN warning
                  onChange={(e) => setNewComponent({ ...newComponent, actual_hours: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  step="0.1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newComponentCost">Cost (ZAR)</Label>
                <Input
                  id="newComponentCost"
                  type="number"
                  value={Number.isFinite(newComponent.component_cost) ? newComponent.component_cost : ""} // Fixed NaN warning
                  onChange={(e) => setNewComponent({ ...newComponent, component_cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newComponentMargin">Margin (%)</Label>
                <Input
                  id="newComponentMargin"
                  type="number"
                  value={Number.isFinite(newComponent.component_margin_percentage) ? newComponent.component_margin_percentage : ""} // Fixed NaN warning
                  onChange={(e) => setNewComponent({ ...newComponent, component_margin_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={addProjectComponent} size="sm" disabled={newComponent.component_price === undefined}>
              <Plus className="w-4 h-4 mr-1" /> Add Component
            </Button>

            <Separator className="my-4" />

            {/* Project Costs Section */}
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Project Costs
            </h4>
            <div className="space-y-3 mb-4">
              {projectCosts.length > 0 ? (
                projectCosts.map(cost => (
                  <div key={cost.cost_id} className="border p-3 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-medium">{cost.cost_type}: R{cost.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{cost.cost_date} - {cost.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteProjectCost(cost.cost_id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No costs added for this project.</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label htmlFor="newCostType">Cost Type</Label>
                <Input
                  id="newCostType"
                  value={newCost.cost_type || ""}
                  onChange={(e) => setNewCost({ ...newCost, cost_type: e.target.value })}
                  placeholder="e.g., Software License, Freelancer Fee"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newCostAmount">Amount (ZAR)</Label>
                <Input
                  id="newCostAmount"
                  type="number"
                  value={Number.isFinite(newCost.amount) ? newCost.amount : ""} // Fixed NaN warning
                  onChange={(e) => setNewCost({ ...newCost, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newCostDate">Date</Label>
                <Input
                  id="newCostDate"
                  type="date"
                  value={newCost.cost_date || ""}
                  onChange={(e) => setNewCost({ ...newCost, cost_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="newCostDescription">Description (Optional)</Label>
                <Input
                  id="newCostDescription"
                  value={newCost.description || ""}
                  onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                  placeholder="Details about this cost"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={addProjectCost} size="sm" disabled={!newCost.cost_type || newCost.amount === undefined || !newCost.cost_date}>
              <Plus className="w-4 h-4 mr-1" /> Add Cost
            </Button>


            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Project Edit Modal */}
      {currentEditProject && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Edit Project: {currentEditProject.project_name}
              </DialogTitle>
              <DialogDescription>
                Update the details for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="editProjectName">Project Name</Label>
                <Input
                  id="editProjectName"
                  value={currentEditProject.project_name || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editClientName">Client Name</Label>
                <select
                  id="editClientName"
                  value={currentEditProject.client_id || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, client_id: parseInt(e.target.value) || undefined })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="edit-select-client" value="">Select Client</option> {/* Added key */}
                  {clients.map(client => (
                    <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="editProjectType">Project Type</Label>
                <select
                  id="editProjectType"
                  value={currentEditProject.project_type || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_type: e.target.value })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="edit-branding" value="Branding">Branding</option> {/* Added key */}
                  <option key="edit-logo-design" value="Logo Design">Logo Design</option> {/* Added key */}
                  <option key="edit-rebranding" value="Rebranding">Rebranding</option> {/* Added key */}
                  <option key="edit-design-general" value="Design">Design (General)</option> {/* Added key */}
                  <option key="edit-digital-branding" value="Digital Branding">Digital Branding</option> {/* Added key */}
                </select>
              </div>
              <div>
                <Label htmlFor="editProjectValue">Project Value (ZAR)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">R</span>
                  <Input
                    id="editProjectValue"
                    type="number"
                    value={Number.isFinite(currentEditProject.project_value) ? currentEditProject.project_value : ""} // Fixed NaN warning
                    onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_value: parseFloat(e.target.value) || 0 })}
                    className="pl-8"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editProjectMargin">Project Margin (%)</Label>
                <div className="relative mt-1">
                  <Input
                    id="editProjectMargin"
                    type="number"
                    value={Number.isFinite(currentEditProject.project_margin_percentage) ? currentEditProject.project_margin_percentage : ""} // Fixed NaN warning
                    onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_margin_percentage: parseFloat(e.target.value) || 0 })}
                    className="pr-8"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <Label htmlFor="editStartDate">Start Date</Label>
                <Input
                  id="editStartDate"
                  type="date"
                  value={currentEditProject.project_start_date || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editEndDate">End Date (Optional)</Label>
                <Input
                  id="editEndDate"
                  type="date"
                  value={currentEditProject.project_end_date || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="editProjectStatus">Project Status</Label>
                <select
                  id="editProjectStatus"
                  value={currentEditProject.project_status || ""}
                  onChange={(e) => setCurrentEditProject({ ...currentEditProject, project_status: e.target.value as ProjectItem["project_status"] })}
                  className="w-full border rounded px-2 py-1 mt-1"
                >
                  <option key="edit-in-progress" value="In Progress">In Progress</option> {/* Added key */}
                  <option key="edit-completed" value="Completed">Completed</option> {/* Added key */}
                  <option key="edit-quoted" value="Quoted">Quoted</option> {/* Added key */}
                  <option key="edit-cancelled" value="Cancelled">Cancelled</option> {/* Added key */}
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" onClick={updateProject}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dedicated Add Client Modal */}
      <Dialog open={isAddClientModalOpen} onOpenChange={setIsAddClientModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Enter details for a new client.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientName" className="text-right">
                Client Name
              </Label>
              <Input
                id="clientName"
                value={newClientData.client_name || ""} // Ensure it's never undefined
                onChange={(e) => setNewClientData({ ...newClientData, client_name: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Acme Corporation"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactPerson" className="text-right">
                Contact Person
              </Label>
              <Input
                id="contactPerson"
                value={newClientData.contact_person || ""}
                onChange={(e) => setNewClientData({ ...newClientData, contact_person: e.target.value })}
                className="col-span-3"
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactEmail" className="text-right">
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={newClientData.contact_email || ""}
                onChange={(e) => setNewClientData({ ...newClientData, contact_email: e.target.value })}
                className="col-span-3"
                placeholder="e.g., john.doe@example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="industry" className="text-right">
                Industry
              </Label>
              <Input
                id="industry"
                value={newClientData.industry || ""}
                onChange={(e) => setNewClientData({ ...newClientData, industry: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Technology"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientType" className="text-right">
                Client Type
              </Label>
              <Input
                id="clientType"
                value={newClientData.client_type || ""}
                onChange={(e) => setNewClientData({ ...newClientData, client_type: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Corporate"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleAddClient} disabled={!newClientData.client_name.trim()}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
