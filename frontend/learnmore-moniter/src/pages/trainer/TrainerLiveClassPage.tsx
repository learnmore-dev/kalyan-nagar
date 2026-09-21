import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { LiveClassRoom } from '@/components/LiveClassRoom';

export default function TrainerLiveClassPage() {
  const params = useParams();
  const batchId = (params?.batchId as string) || 'batch-demo';
  const [userName, setUserName] = useState('Faculty Trainer');
  const [batchName, setBatchName] = useState(`Batch ${batchId.toUpperCase()}`);

  useEffect(() => {
    const user = getStoredUser();
    if (user?.name) {
      setUserName(user.name);
    }

    fetch(`/api/batches`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.batches) {
          const found = data.batches.find((b: any) => b.id === batchId);
          if (found) setBatchName(found.name);
        }
      })
      .catch(() => {});
  }, [batchId]);

  return (
    <LiveClassRoom
      batchId={batchId}
      batchName={batchName}
      userName={userName}
      isTrainer={true}
    />
  );
}
