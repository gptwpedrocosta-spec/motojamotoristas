import { Timestamp } from "firebase/firestore";

export type RideStatus = 
  | 'pending' | 'waiting' | 'procurando_motorista'
  | 'accepted' | 'on_the_way' | 'motorista_a_caminho'
  | 'arrived' | 'motorista_chegou'
  | 'in_progress' | 'iniciada'
  | 'finished' | 'completed' | 'finalizada'
  | 'cancelled' | 'rejected';

export interface Driver {
  uid: string;
  name: string;
  email: string;
  phone: string;
  motoModel: string;
  motoColor: string;
  motoPlate: string;
  online: boolean;
  status: 'idle' | 'busy';
  rating: number;
  totalRides: number;
  earnings: number;
  currentRideId: string | null;
  updatedAt: string | Date | Timestamp;
  location?: {
    latitude: number;
    longitude: number;
    updatedAt: string | Date | Timestamp;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      formattedAddress: string;
    };
  };
}

export interface Ride {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerRating?: number;
  paymentMethod?: 'money' | 'pix' | 'card';
  notes?: string;
  estimatedTime?: number; // in minutes
  pickupAddress: string;
  dropoffAddress: string;
  price: number;
  distance: number; // in km
  status: RideStatus;
  driverId: string | null;
  driverName: string | null;
  createdAt: string | Date | Timestamp;
  acceptedAt?: string | Date | Timestamp | null;
  completedAt?: string | Date | Timestamp | null;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
}

export interface ChatMessage {
  id: string;
  rideId: string;
  sender: 'driver' | 'passenger';
  text: string;
  createdAt: string | Date | Timestamp;
}
