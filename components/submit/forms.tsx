"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/primitives";
import { CITIES, COMPANIES, LEVELS, ROLES, type CatalogItem } from "@/lib/catalog";
import { BODY_MAX, COMMENT_MAX, FLAIRS, TITLE_MAX } from "@/lib/constants";
import { discussionSchema, reviewSchema, salarySchema, type DiscussionForm, type ReviewForm, type SalaryForm } from "@/lib/schemas";
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

export function DiscussionDetails({ defaults, onNext }: { defaults?: Partial<DiscussionForm>; onNext: (v: DiscussionForm) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DiscussionForm>({
    resolver: zodResolver(discussionSchema),
    defaultValues: { title: "", body: "", city: "", ...defaults },
    mode: "onTouched",
  });
  const title = useWatch({ control, name: "title" }) ?? "";
  const body = useWatch({ control, name: "body" }) ?? "";

  return (
    <form
      onSubmit={handleSubmit((v) => onNext({ ...v, title: v.title.trim(), body: v.body?.trim() || undefined, city: v.city || undefined }))}
      noValidate
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="f-company">Community</Label>
          <CatalogSelect
            items={COMPANIES.map((c) => ({ id: c.id, label: `c/${c.id} · ${c.label}` }))}
            placeholder="Select a company"
            id="f-company"
            aria-invalid={errors.company ? true : undefined}
            {...register("company")}
          />
          <FieldError id="e-company" message={errors.company?.message} />
        </div>
        <div>
          <Label htmlFor="f-city">
            Office <span className="font-normal text-muted">(optional)</span>
          </Label>
          <NativeSelect id="f-city" {...register("city")}>
            <option value="">Any / not specific</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">Topic</legend>
        <Controller
          control={control}
          name="flair"
          render={({ field: f }) => (
            <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
              {FLAIRS.map((fl) => (
                <button
                  key={fl.id}
                  type="button"
                  role="radio"
                  aria-checked={f.value === fl.id}
                  onClick={() => f.onChange(fl.id)}
                  className={cn(
                    "h-9 rounded-full px-3.5 text-sm font-medium transition-colors cursor-pointer",
                    f.value === fl.id ? "bg-gradient-primary text-accent-fg" : "bg-surface-2 text-muted ring-1 ring-border hover:text-text",
                  )}
                >
                  {fl.label}
                </button>
              ))}
            </div>
          )}
        />
        <FieldError id="e-flair" message={errors.flair?.message} />
      </fieldset>

      <div>
        <Label htmlFor="f-title">Title</Label>
        <Input
          id="f-title"
          maxLength={TITLE_MAX}
          placeholder="e.g. Is the appraisal cycle delayed again this year?"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby="title-count"
          {...register("title")}
        />
        <div className="mt-1 flex justify-end">
          <span id="title-count" className="tabular text-xs text-muted">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <PIIScanner text={title} />
        <FieldError id="e-title" message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor="f-body">
          Details <span className="font-normal text-muted">(optional)</span>
        </Label>
        <Textarea
          id="f-body"
          maxLength={BODY_MAX}
          className="min-h-36"
          placeholder="What's happening, and what do you want to know? Talk about teams, policies and patterns — not named individuals."
          aria-describedby="body-count"
          {...register("body")}
        />
        <div className="mt-1 flex justify-end">
          <span id="body-count" className={cn("tabular text-xs", body.length > BODY_MAX - 100 ? "text-trust-low" : "text-muted")}>
            {body.length}/{BODY_MAX}
          </span>
        </div>
        <PIIScanner text={body} />
      </div>

      <Button type="submit" size="lg" className="self-stretch sm:self-end">
        Continue <ArrowRight />
      </Button>
    </form>
  );
}
