import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <nav className="flex gap-2 p-4 bg-card border-b">
      <Button asChild variant="ghost">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            isActive ? "bg-primary text-primary-foreground" : ""
          }
        >
          Non-Moving GC
        </NavLink>
      </Button>
      <Button asChild variant="ghost">
        <NavLink 
          to="/compacting" 
          className={({ isActive }) => 
            isActive ? "bg-primary text-primary-foreground" : ""
          }
        >
          Compacting GC
        </NavLink>
      </Button>
    </nav>
  );
};