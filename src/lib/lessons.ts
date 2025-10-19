// src/lib/lessons.ts
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, arrayUnion, increment, runTransaction, Timestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { generateLessonContent } from '@/ai/flows/generate-lesson-content';
import { generateLessonImage } from '@/ai/flows/generate-lesson-image';
import { uploadImageFromDataUrl, uploadAudioFromDataUrl } from './storage';
import { generateAudioFromText } from '@/ai/flows/generate-audio-from-text';
import { Lesson, LessonRequest, Achievement } from './types';
import { createSystemAnnouncement } from './announcements';

export async function getLessons(): Promise<Lesson[]> {
    const snapshot = await getDocs(collection(db, 'lessons'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
}

export async function getLesson(id: string): Promise<Lesson | null> {
    try {
        const lessonRef = doc(db, 'lessons', id);
        const lessonSnap = await getDoc(lessonRef);
        return lessonSnap.exists() ? { id: lessonSnap.id, ...lessonSnap.data() } as Lesson : null;
    } catch (error) {
        console.error("Error fetching lesson: ", error);
        throw new Error(`Failed to fetch lesson ${id}`);
    }
}

export async function generateAndStoreLessonAudio(lessonId: string): Promise<void> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);
  if (!lessonDoc.exists()) throw new Error("Lesson not found to generate audio for.");

  const lesson = lessonDoc.data() as Lesson;
  if (!lesson.sections) return;

  const updatedSections = await Promise.all(
    lesson.sections.map(async (section, index) => {
      if (section.audioUrl || !section.blocks.some(b => b.type === 'text')) return section;
      const textContent = section.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n');
      if (!textContent.trim()) return section;
      try {
        const { audioDataUri } = await generateAudioFromText({ sectionTitle: section.title, sectionContent: textContent });
        const fileName = `${lessonId}_section_${index}`;
        const audioUrl = await uploadAudioFromDataUrl(audioDataUri, fileName);
        return { ...section, audioUrl };
      } catch (error) {
        console.error(`Failed to generate audio for section ${index} of lesson ${lessonId}:`, error);
        return section; 
      }
    })
  );
  await updateDoc(lessonRef, { sections: updatedSections });
}

export async function generateAndCacheLessonAudioForSection(lessonId: string, sectionIndex: number): Promise<string> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);
  if (!lessonDoc.exists()) throw new Error("Lesson not found");

  const lesson = lessonDoc.data() as Lesson;
  const section = lesson.sections?.[sectionIndex];
  if (!section) throw new Error("Section not found");
  if (section.audioUrl) return section.audioUrl;

  const textContent = section.blocks.filter(b => b.type === 'text').map(b => (b as any).content).join('\n\n');
  if (!textContent.trim()) throw new Error("Section has no text content to generate audio from.");

  const { audioDataUri } = await generateAudioFromText({ sectionTitle: section.title, sectionContent: textContent });
  const fileName = `${lessonId}_section_${sectionIndex}_${Date.now()}`;
  const audioUrl = await uploadAudioFromDataUrl(audioDataUri, fileName);

  const updatedSections = [...(lesson.sections || [])];
  updatedSections[sectionIndex] = { ...section, audioUrl };
  await updateDoc(lessonRef, { sections: updatedSections });

  return audioUrl;
}

export async function createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "lessons"), lessonData);
    generateAndStoreLessonAudio(docRef.id).catch(console.error);
    await createSystemAnnouncement({
        type: 'new_lesson',
        title: `New Lesson Added: ${lessonData.title}`,
        message: `Explore the new lesson on ${lessonData.subject}. Happy learning!`,
        link: `/dashboard/lessons/${docRef.id}`
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating lesson: ", error);
    throw new Error("Failed to create lesson");
  }
}

export async function updateLesson(lessonId: string, lessonData: Partial<Omit<Lesson, 'id'>>): Promise<void> {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, lessonData);
    generateAndStoreLessonAudio(lessonId).catch(console.error);
  } catch (error) {
    console.error("Error updating lesson: ", error);
    throw new Error("Failed to update lesson");
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'lessons', lessonId));
    } catch (error) {
        console.error("Error deleting lesson: ", error);
        throw new Error("Failed to delete lesson");
    }
}

export async function completeLesson(userId: string, lessonId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    try {
        await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const userData = userSnap.data() as any;
            const progress = userData.progress || {};
            if (progress.completedLessonIds?.includes(lessonId)) return;

            const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
            if (!lessonSnap.exists()) throw new Error("Lesson not found");
            const subject = lessonSnap.data().subject;

            const subjectQuery = query(collection(db, 'lessons'), where('subject', '==', subject));
            const subjectLessonsSnapshot = await getDocs(subjectQuery);
            const totalLessonsInSubject = subjectLessonsSnapshot.size;

            const completedLessonIds = [...(progress.completedLessonIds || []), lessonId];
            const completedInSubjectCount = completedLessonIds.filter((id: string) => subjectLessonsSnapshot.docs.some(d => d.id === id)).length;
            const newMastery = totalLessonsInSubject > 0 ? Math.round((completedInSubjectCount / totalLessonsInSubject) * 100) : 0;
            const subjectsMastery = [...(progress.subjectsMastery || [])];
            const subjectIndex = subjectsMastery.findIndex((sm: any) => sm.subject === subject);
            if (subjectIndex > -1) subjectsMastery[subjectIndex].mastery = newMastery;
            else subjectsMastery.push({ subject: subject, mastery: newMastery });

            const overallMastery = subjectsMastery.length > 0 ? Math.round(subjectsMastery.reduce((acc: number, subj: any) => acc + subj.mastery, 0) / subjectsMastery.length) : 0;
            const newAchievements: Achievement[] = (progress.completedLessonIds?.length || 0) === 0 ? ['FIRST_LESSON_COMPLETE'] : [];

            transaction.update(userRef, {
                'progress.completedLessons': increment(1),
                'progress.completedLessonIds': completedLessonIds,
                'progress.subjectsMastery': subjectsMastery,
                'progress.mastery': overallMastery,
                'progress.xp': increment(50),
                'progress.achievements': arrayUnion(...newAchievements),
            });
        });
    } catch (error) {
        console.error("Error completing lesson: ", error);
        throw new Error("Failed to update lesson progress.");
    }
}

export async function createLessonRequest(userId: string, userName: string, requestData: Omit<LessonRequest, 'id' | 'userId' | 'userName' | 'status' | 'createdAt'>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found.");
        const userData = userDoc.data() as any;
        if (userData.lastLessonRequestAt && userData.lastLessonRequestAt > Date.now() - 7 * 24 * 60 * 60 * 1000) {
            throw new Error("You can only submit one lesson request per week.");
        }
        transaction.set(doc(collection(db, 'lessonRequests')), {
            ...requestData, userId, userName, status: 'pending', createdAt: Timestamp.now(),
        });
        transaction.update(userRef, { lastLessonRequestAt: Date.now() });
    });
}

export async function getPendingLessonRequests(): Promise<LessonRequest[]> {
    const q = query(collection(db, "lessonRequests"), where("status", "==", "pending"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonRequest));
}

export async function approveLessonRequest(requestId: string): Promise<void> {
    const requestRef = doc(db, 'lessonRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    if (!requestDoc.exists() || requestDoc.data().status !== 'pending') {
        throw new Error("Request not found or already processed.");
    }
    const requestData = requestDoc.data() as Omit<LessonRequest, 'id'>;

    const lessonContent = await generateLessonContent({
        topic: requestData.title, subject: requestData.subject, topicDepth: "Detailed",
    });
    const { imageUrl } = await generateLessonImage({
        prompt: `A high-quality, educational illustration for a lesson on "${lessonContent.title}" in ${lessonContent.subject}.`,
        style: 'educational',
        speed: 'nano-banana',
        context: `Auto-generated lesson: ${lessonContent.title}, Subject: ${lessonContent.subject}, Difficulty: ${lessonContent.difficulty}`
    });
    const publicImageUrl = await uploadImageFromDataUrl(imageUrl, `lesson_${Date.now()}`);
    
    await createLesson({ ...lessonContent, image: publicImageUrl });
    await updateDoc(requestRef, { status: 'approved' });
}
