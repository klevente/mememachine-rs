import { Button } from "./button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Link } from "@remix-run/react";

interface DataTablePaginationProps {
  numOfItems: number;
  page: number;
  pageCount: number;
  onFirstPage: boolean;
  onLastPage: boolean;
  url: string;
}

export function SimplePagination({
  numOfItems,
  page,
  pageCount,
  onFirstPage,
  onLastPage,
  url,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-center px-2 mt-2">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          {onFirstPage ? (
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              disabled
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
            >
              <Link to={`${url}?page=1`}>
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {onFirstPage ? (
            <Button variant="outline" className="h-8 w-8 p-0" disabled>
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-8 w-8 p-0">
              <Link to={`${url}?page=${page - 1}`}>
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div className="flex items-center justify-center text-sm font-medium">
            Page {page} of {pageCount} ({numOfItems} rows)
          </div>
          {onLastPage ? (
            <Button variant="outline" className="h-8 w-8 p-0" disabled>
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-8 w-8 p-0">
              <Link to={`${url}?page=${page + 1}`}>
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {onLastPage ? (
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              disabled
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
            >
              <Link to={`${url}?page=${pageCount}`}>
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
