
import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SiteSwitcher() {
  return (
    <Select defaultValue="dev">
      <SelectTrigger className="w-[180px] h-8 mr-1">
        <SelectValue placeholder="Select environment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dev">Development</SelectItem>
        <SelectItem value="prod">Production</SelectItem>
      </SelectContent>
    </Select>
  )
}
