"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  User,
  Scale,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";

const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(0).max(18),
  school: z.string().optional(),
  grade: z.string().optional(),
  notes: z.string().optional(),
});

const caseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  parentAId: z.string().min(1, "Parent A is required"),
  parentBId: z.string().min(1, "Parent B is required"),
  mediatorId: z.string().optional(),
  children: z.array(childSchema).optional(),
});

type CaseFormValues = z.infer<typeof caseSchema>;

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface CreateCaseFormProps {
  parents: UserOption[];
  mediators: UserOption[];
  isAdmin: boolean;
  currentUserId: string;
  currentUserRole: string;
}

export function CreateCaseForm({
  parents,
  mediators,
  isAdmin,
  currentUserId,
  currentUserRole,
}: CreateCaseFormProps) {
  const router = useRouter();
  const [children, setChildren] = useState<
    { name: string; age: number; school: string; grade: string; notes: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createAssessments, setCreateAssessments] = useState(false);
  const [assessmentType, setAssessmentType] = useState("CO_PARENTING");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      title: "",
      parentAId: currentUserRole === "PARENT" ? currentUserId : "",
      parentBId: "",
      mediatorId: "",
    },
  });

  const selectedParentA = watch("parentAId");
  const selectedParentB = watch("parentBId");

  // Filter out already-selected parent from the other dropdown
  const availableForB = parents.filter((p) => p.id !== selectedParentA);
  const availableForA = parents.filter((p) => p.id !== selectedParentB);

  const addChild = () => {
    setChildren([
      ...children,
      { name: "", age: 0, school: "", grade: "", notes: "" },
    ]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...children];
    (updated[index] as Record<string, string | number>)[field] = value;
    setChildren(updated);
  };

  const onSubmit = async (data: CaseFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          children: children.length > 0 ? children : undefined,
          createAssessments: isAdmin ? createAssessments : false,
          assessmentType: isAdmin && createAssessments ? assessmentType : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to create case");
      }

      const result = await response.json();
      toast.success("Case created successfully");
      router.push(`/cases/${result.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create case"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Case Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Case Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register("title")}
          placeholder="e.g., Smith Family Case"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        {errors.title && (
          <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Parent Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="parentAId"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            <User className="w-3.5 h-3.5 inline mr-1" />
            Parent A <span className="text-red-500">*</span>
          </label>
          <select
            id="parentAId"
            {...register("parentAId")}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
          >
            <option value="">Select parent A</option>
            {availableForA.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name ?? parent.email}
              </option>
            ))}
          </select>
          {errors.parentAId && (
            <p className="text-xs text-red-500 mt-1">
              {errors.parentAId.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="parentBId"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            <User className="w-3.5 h-3.5 inline mr-1" />
            Parent B <span className="text-red-500">*</span>
          </label>
          <select
            id="parentBId"
            {...register("parentBId")}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
          >
            <option value="">Select parent B</option>
            {availableForB.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name ?? parent.email}
              </option>
            ))}
          </select>
          {errors.parentBId && (
            <p className="text-xs text-red-500 mt-1">
              {errors.parentBId.message}
            </p>
          )}
        </div>
      </div>

      {/* Mediator Selection */}
      {isAdmin && (
        <div>
          <label
            htmlFor="mediatorId"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            <Scale className="w-3.5 h-3.5 inline mr-1" />
            Assign Mediator
          </label>
          <select
            id="mediatorId"
            {...register("mediatorId")}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white"
          >
            <option value="">No mediator assigned</option>
            {mediators.map((mediator) => (
              <option key={mediator.id} value={mediator.id}>
                {mediator.name ?? mediator.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Assessment assignment (admin only) */}
      {isAdmin && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">
              Initial Assessment
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createAssessments}
              onChange={(e) => setCreateAssessments(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">
              Create an initial assessment for both parents
            </span>
          </label>
          {createAssessments && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Assessment Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
              >
                <option value="CO_PARENTING">Co-Parenting Assessment</option>
                <option value="CHILD_WELLBEING">Child Wellbeing Assessment</option>
                <option value="PARENTING_CAPACITY">Parenting Capacity Assessment</option>
                <option value="CONFLICT_RESOLUTION">Conflict Resolution Assessment</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Both parents will receive this assessment to complete. Results will be
                compared to identify gaps for mediation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Children Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            <GraduationCap className="w-3.5 h-3.5 inline mr-1" />
            Children
          </label>
          <button
            type="button"
            onClick={addChild}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Child
          </button>
        </div>

        {children.length === 0 && (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
            No children added yet. Click &ldquo;Add Child&rdquo; to add children
            to this case.
          </p>
        )}

        <div className="space-y-3">
          {children.map((child, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">
                  Child #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`child-name-${index}`}
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`child-name-${index}`}
                    type="text"
                    value={child.name}
                    onChange={(e) => updateChild(index, "name", e.target.value)}
                    placeholder="Child's name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-age-${index}`}
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Age
                  </label>
                  <input
                    id={`child-age-${index}`}
                    type="number"
                    min={0}
                    max={18}
                    value={child.age || ""}
                    onChange={(e) =>
                      updateChild(index, "age", parseInt(e.target.value) || 0)
                    }
                    placeholder="Age"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-school-${index}`}
                    className="block text-xs text-gray-500 mb-1"
                  >
                    School
                  </label>
                  <input
                    id={`child-school-${index}`}
                    type="text"
                    value={child.school}
                    onChange={(e) =>
                      updateChild(index, "school", e.target.value)
                    }
                    placeholder="School name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`child-grade-${index}`}
                    className="block text-xs text-gray-500 mb-1"
                  >
                    Grade
                  </label>
                  <input
                    id={`child-grade-${index}`}
                    type="text"
                    value={child.grade}
                    onChange={(e) =>
                      updateChild(index, "grade", e.target.value)
                    }
                    placeholder="Grade"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Case"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
