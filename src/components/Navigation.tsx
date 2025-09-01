import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <nav className="flex gap-2 p-4 bg-card border-b border-border shadow-sm">
      <div className="flex gap-2">
        <Button asChild variant="ghost" size="sm">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
            }
          >
            Non-Moving GC
          </NavLink>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <NavLink 
            to="/compacting" 
            className={({ isActive }) => 
              `transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`
            }
          >
            Compacting GC
          </NavLink>
        </Button>
      </div>
    </nav>
  );
};