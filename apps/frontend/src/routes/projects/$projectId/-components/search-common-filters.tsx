import { Button } from "@wiki/frontend/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Input } from "@wiki/frontend/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@wiki/frontend/components/ui/select";
import { formatOption, type SearchFiltersFormValues } from "@wiki/frontend/modules/search/search-filters";
import { documentStatusValues } from "@wiki/shared";
import { Search } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

interface SearchCommonFiltersProps {
  form: UseFormReturn<SearchFiltersFormValues>;
  isSearching: boolean;
}

export function SearchCommonFilters({ form, isSearching }: SearchCommonFiltersProps) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_170px_150px_96px_auto] lg:items-end">
      <FormField
        control={form.control}
        name="query"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Search</FormLabel>
            <FormControl>
              <Input placeholder="Find exact terms and related meaning" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Scope</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="current_project">Current project</SelectItem>
                <SelectItem value="selected_projects">Selected projects</SelectItem>
                <SelectItem value="all_projects">All projects</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="documentStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="any">Any status</SelectItem>
                {documentStatusValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatOption(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="limit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Limit</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <Button aria-busy={isSearching} disabled={isSearching} type="submit">
        <Search strokeWidth={1.5} />
        {isSearching ? "Searching" : "Search"}
      </Button>
    </div>
  );
}
