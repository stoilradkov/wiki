import { zodResolver } from "@hookform/resolvers/zod";
import { FieldError } from "@wiki/frontend/components/interaction";
import { Button } from "@wiki/frontend/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@wiki/frontend/components/ui/form";
import { Textarea } from "@wiki/frontend/components/ui/textarea";
import { createChatMessageRequestSchema, type CreateChatMessageRequest } from "@wiki/shared";
import { Send } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

interface ChatComposerProps {
  errorMessage: string | null;
  isSending: boolean;
  onSubmit: (values: CreateChatMessageRequest) => void;
  resetVersion: number;
}

export function ChatComposer({
  errorMessage,
  isSending,
  onSubmit,
  resetVersion
}: ChatComposerProps) {
  const form = useForm<CreateChatMessageRequest>({
    defaultValues: {
      content: ""
    },
    resolver: zodResolver(createChatMessageRequestSchema.pick({ content: true }))
  });
  const mutationErrorId = "chat-composer-mutation-error";

  function handleSubmit(values: CreateChatMessageRequest) {
    onSubmit(values);
  }

  useEffect(() => {
    if (resetVersion > 0) {
      form.reset({ content: "" });
    }
  }, [form, resetVersion]);

  return (
    <Form {...form}>
      <form className="space-y-2" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  aria-describedby={errorMessage ? mutationErrorId : undefined}
                  className="min-h-24 resize-none"
                  disabled={isSending}
                  placeholder="Ask about this knowledge base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button aria-busy={isSending} disabled={isSending} title="Send message" type="submit">
            <Send strokeWidth={1.5} />
            {isSending ? "Sending" : "Send"}
          </Button>
        </div>
        <FieldError id={mutationErrorId}>{errorMessage}</FieldError>
      </form>
    </Form>
  );
}
