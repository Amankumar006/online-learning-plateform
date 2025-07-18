// src/lib/announcements.ts
import { db } from './firebase';
import { collection, getDocs, addDoc, Timestamp, query, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { Announcement } from './types';
import { getUsers } from './user';

export async function createSystemAnnouncement(announcementData: Omit<Announcement, 'id' | 'createdAt'>): Promise<void> {
    try {
        const payload = { ...announcementData };
        if (!payload.link) {
            delete (payload as Partial<typeof payload>).link;
        }
        await addDoc(collection(db, "announcements"), {
            ...payload,
            createdAt: Timestamp.now()
        });
    } catch (error) {
        console.error("Error creating system announcement: ", error);
        throw new Error("Failed to create system announcement.");
    }
}

async function queueEmailsForAnnouncement(subject: string, message: string, link?: string): Promise<void> {
    try {
        const users = await getUsers();
        const emailQueueCollection = collection(db, "emailQueue");
        const emailPromises = users
            .filter(user => user.email)
            .map(user => {
                const htmlBody = `
                    <h1>${subject}</h1>
                    <p>${message}</p>
                    ${link ? `<p><a href="${link}">Learn more here</a></p>` : ''}
                    <br/>
                    <p><small>You are receiving this email as a user of AdaptEd AI.</small></p>
                `;
                return addDoc(emailQueueCollection, {
                    to: user.email,
                    message: { subject: `[AdaptEd AI] ${subject}`, html: htmlBody },
                });
            });
        await Promise.all(emailPromises);
    } catch (error) {
        console.error("Error queuing emails:", error);
    }
}

export async function createCustomAnnouncement(announcementData: Omit<Announcement, 'id' | 'createdAt'>, sendToGmail?: boolean): Promise<void> {
    try {
        const payload: { [key: string]: any } = { ...announcementData };
        if (!payload.link) {
            delete payload.link;
        }
        await addDoc(collection(db, "announcements"), {
            ...payload,
            createdAt: Timestamp.now()
        });
        if (sendToGmail) {
            await queueEmailsForAnnouncement(payload.title, payload.message, payload.link);
        }
    } catch (error) {
        console.error("Error creating custom announcement: ", error);
        throw new Error("Failed to send the announcement.");
    }
}

export async function getRecentAnnouncements(count = 10): Promise<Announcement[]> {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
}

export async function markAnnouncementsAsRead(userId: string): Promise<void> {
    try {
        await updateDoc(doc(db, 'users', userId), { lastCheckedAnnouncementsAt: Timestamp.now() });
    } catch (error) {
        console.error("Error marking announcements as read:", error);
        throw new Error("Failed to update user's notification status.");
    }
}
