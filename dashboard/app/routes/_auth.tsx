import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { LogOut, MenuIcon, Users } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const isAdmin = user.role === "admin";

  return json({ user, isAdmin });
}

export default function Layout() {
  const { user, isAdmin } = useLoaderData<typeof loader>();
  return (
    <div>
      <header className="flex justify-between">
        <Link to="/">
          <h1 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <img src="/favicon.ico" alt="icon" className="w-8 img-pixelated" />{" "}
            Mememachine
          </h1>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden">
              <MenuIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span>{user.email}</span>
            </DropdownMenuLabel>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <Link to="/users">
                  <DropdownMenuItem>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Users</span>
                  </DropdownMenuItem>
                </Link>
              </>
            )}
            <DropdownMenuSeparator />
            <Link to="/logout">
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <Outlet />
    </div>
  );
}
