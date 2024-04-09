'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { error } from 'console';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(
        {invalid_type_error: 'Please select a customer',}
    ),
    amount: z.coerce.number().gt(0, {
        message: 'Please enter an amount greater tham $0.',
    }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

export type State = {
    error?: {
        customerId?: string[],
        amount?: string[],
        status?: string[],
    };
    message?: string | null;
};

const CreateInvoice = FormSchema.omit({id: true, date:true});
const UpdateInvoice = FormSchema.omit({id: true, date:true});

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFileds = CreateInvoice.safeParse( {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFileds.success) {
        return {
            errors: validatedFileds.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice',
        }
    }

    const { customerId, amount, status } = validatedFileds.data;
 
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice',
        }
    }

    const path = '/dashboard/invoices';

    revalidatePath(path);
    redirect(path)
}

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    try {
        await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice',
        }
    }

    const path = '/dashboard/invoices';

    revalidatePath(path);
    redirect(path)
}

export async function deleteInvoice(id: string) {
    try {
        await sql`
        DELETE FROM invoices WHERE id = ${id}
    `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice',
        }
    }
    const path = '/dashboard/invoices';

    revalidatePath(path);
}