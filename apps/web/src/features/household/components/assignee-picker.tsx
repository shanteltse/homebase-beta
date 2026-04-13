"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useHouseholdMembers } from "../api/get-members";
import { MemberAvatar } from "./member-avatar";

type AssigneePickerProps = {
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
};

export function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  const { data: members } = useHouseholdMembers();

  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="label text-foreground">Who's responsible?</label>
      <Select
        value={value ?? "unassigned"}
        onValueChange={(val) =>
          onChange(val === "unassigned" ? undefined : val)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <div className="flex items-center gap-2">
                <MemberAvatar
                  name={member.name}
                  image={member.image}
                  size="sm"
                />
                <span>{member.name ?? member.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

    </div>
  );
}
