import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  auth0Id: string;
  email: string;
  name: string;
  role: 'admin' | 'operador' | 'lector';
  active: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    auth0Id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'operador', 'lector'],
      default: 'lector',
      required: true,
    },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
