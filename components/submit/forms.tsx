"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/primitives";
import { CITIES, COMPANIES, LEVELS, ROLES, type CatalogItem } from "@/lib/catalog";
import { COMMENT_MAX } from "@/lib/constants";
import { reviewSchema, salarySchema, type ReviewForm, type SalaryForm } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { FieldError, MoneyInput, PIIScanner, StarRating } from "./fields";

function CatalogSelect({ items, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { items: CatalogItem[]; placeholder: string }) {
  return (
    <NativeSelect defaultValue="" {...props}>
      <option value="" disabled>
        {placeholder}
      </option>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
          {i.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function SalaryDetails({ defaults, onNext }: { defaults?: Partial<SalaryForm>; onNext: (v: SalaryForm) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SalaryForm>({ resolver: zodResolver(salarySchema), defaultValues: defaults, mode: "onTouched" });

  const field = (name: keyof SalaryForm) => ({
    id: `f-${name}`,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `e-${name}` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} noValidate className="flex flex-col gap-5">
      <div>
        <Label htmlFor="f-company">Company</Label>
        <CatalogSelect items={COMPANIES} placeholder="Select a company" {...field("company")} {...register("company")} />
        <FieldError id="e-company" message={errors.company?.message} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="f-role">Role</Label>
          <CatalogSelect items={ROLES} placeholder="Select a role" {...field("role")} {...register("role")} />
          <FieldError id="e-role" message={errors.role?.message} />
        </div>
        <div>
          <Label htmlFor="f-level">Level</Label>
          <CatalogSelect items={LEVELS} placeholder="Select a level" {...field("level")} {...register("level")} />
          <FieldError id="e-level" message={errors.level?.message} />
        </div>
        <div>
          <Label htmlFor="f-city">City</Label>
          <CatalogSelect items={CITIES} placeholder="Select a city" {...field("city")} {...register("city")} />
          <FieldError id="e-city" message={errors.city?.message} />
        </div>
        <div>
          <Label htmlFor="f-yoe">Years of experience</Label>
          <Input type="number" inputMode="numeric" min={0} max={45} step={1} placeholder="e.g. 4" {...field("yoe")} {...register("yoe", { valueAsNumber: true })} />
          <FieldError id="e-yoe" message={errors.yoe?.message} />
        </div>
      </div>
      <div>
        <Label htmlFor="f-ctc">Annual CTC</Label>
        <Controller
          control={control}
          name="ctc"
          render={({ field: f }) => (
            <MoneyInput id="f-ctc" value={f.value} onChange={f.onChange} invalid={!!errors.ctc} describedBy={errors.ctc ? "e-ctc" : undefined} />
          )}
        />
        <FieldError id="e-ctc" message={errors.ctc?.message} />
      </div>
      <div>
        <Label htmlFor="f-baseSalary">
          Base salary <span className="font-normal text-muted">(optional, annual)</span>
        </Label>
        <Controller
          control={control}
          name="baseSalary"
          render={({ field: f }) => (
            <MoneyInput id="f-baseSalary" value={f.value} onChange={f.onChange} invalid={!!errors.baseSalary} describedBy={errors.baseSalary ? "e-baseSalary" : undefined} />
          )}
        />
        <FieldError id="e-baseSalary" message={errors.baseSalary?.message} />
      </div>
      <Button type="submit" size="lg" className="self-stretch sm:self-end">
        Continue <ArrowRight />
      </Button>
    </form>
  );
}

export function ReviewDetails({ defaults, onNext }: { defaults?: Partial<ReviewForm>; onNext: (v: ReviewForm) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewForm>({ resolver: zodResolver(reviewSchema), defaultValues: { comment: "", ...defaults }, mode: "onTouched" });
  const comment = useWatch({ control, name: "comment" }) ?? "";

  return (
    <form onSubmit={handleSubmit((v) => onNext({ ...v, comment: v.comment?.trim() || undefined }))} noValidate className="flex flex-col gap-5">
      <div>
        <Label htmlFor="f-company">Company</Label>
        <CatalogSelect
          items={COMPANIES}
          placeholder="Select a company"
          id="f-company"
          aria-invalid={errors.company ? true : undefined}
          {...register("company")}
        />
        <FieldError id="e-company" message={errors.company?.message} />
      </div>
      <fieldset className="flex flex-col gap-1 rounded-[14px] border border-border p-4">
        <legend className="px-1 text-sm font-medium">Ratings</legend>
        {(
          [
            ["wlb", "Work-life balance"],
            ["management", "Management"],
            ["growth", "Growth"],
            ["culture", "Culture"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field: f }) => <StarRating label={label} value={f.value} onChange={f.onChange} error={errors[name]?.message} />}
          />
        ))}
      </fieldset>
      <div>
        <Label htmlFor="f-comment">
          Comment <span className="font-normal text-muted">(optional)</span>
        </Label>
        <Textarea
          id="f-comment"
          maxLength={COMMENT_MAX}
          placeholder="What should someone joining know? Don't name people or teams."
          aria-describedby="comment-count"
          {...register("comment")}
        />
        <div className="mt-1 flex justify-end">
          <span id="comment-count" className={cn("tabular text-xs", comment.length > COMMENT_MAX - 20 ? "text-trust-low" : "text-muted")}>
            {comment.length}/{COMMENT_MAX}
          </span>
        </div>
        <PIIScanner text={comment} />
        {errors.comment?.message && !comment && <FieldError id="e-comment" message={errors.comment.message} />}
      </div>
      <Button type="submit" size="lg" className="self-stretch sm:self-end">
        Continue <ArrowRight />
      </Button>
    </form>
  );
}
