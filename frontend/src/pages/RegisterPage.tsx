import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useRegister } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const reg = useRegister();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">Get started with TaskApp</p>
        </div>

        <form onSubmit={handleSubmit((d) => reg.mutate(d))} className="space-y-4">
          <Input label="Full name" autoComplete="name" {...register('fullName')} error={errors.fullName?.message} />
          <Input label="Email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
          {reg.error && <p className="text-sm text-red-600">Registration failed. Please try again.</p>}
          <Button type="submit" className="w-full" loading={reg.isPending}>Create account</Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
