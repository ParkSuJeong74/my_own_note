import { expect, test } from "@playwright/test";

test("personal note survives refresh, search and trash restore", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "내 기록" })).toBeVisible();
  await expect(page.getByText("이 브라우저에 저장됨")).toBeVisible();

  await page.getByLabel("새 항목 이름").fill("집필");
  await page.getByRole("button", { name: "폴더", exact: true }).click();
  await page.getByLabel("새 항목 이름").fill("첫 장");
  await page.getByRole("button", { name: "이 폴더에 페이지 추가" }).click();
  await page.getByLabel("페이지 본문").fill("첫 문장\n검색 가능한 용의 기록");
  await expect(page.getByText("이 브라우저에 저장됨")).toBeVisible();

  await page.reload();
  await page.getByRole("navigation", { name: "폴더와 페이지" }).getByRole("button", { name: /첫 장/ }).click();
  await expect(page.getByLabel("페이지 본문")).toHaveValue("첫 문장\n검색 가능한 용의 기록");

  await page.getByLabel("전체 검색").fill("용의 기록");
  await expect(page.getByText("페이지 본문", { exact: true }).first()).toBeVisible();
  await page.getByRole("navigation", { name: "폴더와 페이지" }).getByRole("button", { name: /첫 장.*페이지 본문/ }).click();
  await page.getByRole("button", { name: "휴지통으로 이동" }).click();
  await expect(page.getByRole("navigation", { name: "폴더와 페이지" }).getByRole("button", { name: /첫 장/ })).toHaveCount(0);
  await page.getByRole("button", { name: "복원" }).click();
  await expect(page.getByLabel("페이지 본문")).toHaveValue("첫 문장\n검색 가능한 용의 기록");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "백업 내보내기" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mano-backup-\d{4}-\d{2}-\d{2}\.json$/);
});
