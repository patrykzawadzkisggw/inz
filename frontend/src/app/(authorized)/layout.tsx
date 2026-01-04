import { AppSidebar } from "@/components/app-sidebar"
// Usunięto statyczne breadcrumb importy na rzecz dynamicznego komponentu
import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import ConditionalNavActions from "@/components/ConditionalNavActions";
import { DashboardProvider } from "@/context/DashboardContext";
import { UserFunctionsProvider } from "@/context/UserFunctionsContext";
import { ModelsProvider } from "@/context/ModelsContext";
import { ReportsProvider } from "@/context/ReportsContext";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

        <SidebarProvider>
          <DashboardProvider>
            <UserFunctionsProvider>
              <ModelsProvider>
                <ReportsProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <AppBreadcrumbs />
          </div>

            <div className="ml-auto px-3">
              <ConditionalNavActions />
            </div>
      
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
           {children}
        </div>
      </SidebarInset>
                </ReportsProvider>
      </ModelsProvider>
      </UserFunctionsProvider>
      </DashboardProvider>
    </SidebarProvider>

  );
}






