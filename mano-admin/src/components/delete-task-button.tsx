"use client";

import { deleteTaskAction } from "@/app/automation/actions";

export function DeleteTaskButton({ id }: { id: string }) {
  return <form action={deleteTaskAction} onSubmit={(event) => {
    if (!window.confirm("이 Task와 실행 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) event.preventDefault();
  }}><input type="hidden" name="id" value={id}/><button className="danger-button">Task 삭제</button></form>;
}
