'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from '../../lib/firebaseConfig';
import { useState } from 'react';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const getFirestoreData = async () => {
  const docRef = doc(db, 'example', 'example-document');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log('Document data:', docSnap.data());
    return docSnap.data();
  } else {
    console.log('No such document!');
    return null;
  }
};

const getTasks = async () => {
  const tasksCol = collection(db, 'tasks');
  const taskSnapshot = await getDocs(tasksCol);
  const taskList = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('Tasks:', taskList);
  return taskList;
};

export default function FirebaseUI() {
  const { userId } = useAuth();
  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [firestoreData, setFirestoreData] = useState(null);
  const [tasks, setTasks] = useState([]);

  if (!userId) {
    return <p>You need to sign in with Clerk to access this page.</p>;
  }

  const fetchFirestoreData = async () => {
    setLoadingFirestore(true);
    try {
      const data = await getFirestoreData();
      setFirestoreData(data);
    } catch (error) {
      console.error('Firestore fetch error:', error);
    } finally {
      setLoadingFirestore(false);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const taskList = await getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Tasks fetch error:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', rowGap: '1rem', padding: '1rem' }}>
      <button onClick={fetchFirestoreData} disabled={loadingFirestore}>
        {loadingFirestore ? 'Fetching...' : 'Get Firestore Document'}
      </button>
      <button onClick={fetchTasks} disabled={loadingTasks}>
        {loadingTasks ? 'Fetching Tasks...' : 'Get Tasks'}
      </button>
      {firestoreData && (
        <div>
          <h3>Example Document</h3>
          <pre>{JSON.stringify(firestoreData, null, 2)}</pre>
        </div>
      )}
      {tasks.length > 0 && (
        <div>
          <h3>Tasks</h3>
          <ul>
            {tasks.map(task => (
              <li key={task.id}>
                <strong>{task.title}</strong>: {task.description} (Status: {task.status})
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}