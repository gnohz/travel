export type Category = 'hiking' | 'restaurant' | 'shopping' | 'hotel' | 'airport' | 'parking' | 'attraction';
export type Status = 'confirmed' | 'planned' | 'preferred' | 'alternative' | 'needs_verification';
export type Source = { title: string; url: string };
export type Place = {
  id: string; name: string; chineseName?: string; category: Category;
  address?: string; coordinates?: { latitude: number; longitude: number };
  description: string; parkingNotes?: string; openingHours?: string; officialUrl?: string; officialLinkLabel?: string;
  notes: string[]; verificationStatus: 'confirmed' | 'estimated' | 'needs_verification';
  navigationId?: string; image?: string; sources?: Source[];
  photoCredit?: { author: string; source: string; license: string; licenseUrl: string };
  trail?: { distance: string; duration: string; elevation: string; difficulty: string; route: string; shuttle?: string };
};
export type Activity = {
  id: string; time: string; endTime?: string; title: string; placeId?: string;
  description: string; duration?: string; notes: string[]; status: Status;
  optionGroup?: string; option?: 'A' | 'B'; timeZone?: string;
  condition?: { group: string; option: 'A' | 'B' };
};
export type Day = { date: string; weekday: string; title: string; subtitle: string; image: string; summary: string; activities: Activity[] };
export type TravelData = {
  title: string; dates: string; party: string; updatedAt: string;
  days: Day[]; places: Place[];
  flights: { label: string; number: string; from: string; to: string; departure: string; arrival: string; notes: string }[];
  rental: { company: string; vehicle: string; details: string[] };
  stays: { placeId: string; nights: number; checkIn: string; checkOut: string; url?: string }[];
  shopping: string[]; checklist: string[]; verification: string[]; sources: Source[];
};
