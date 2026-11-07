import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH, CODES, REQUEST } from '@shared/theme/tokens';
import { Screen, useBottomChromePadding } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import {
  Avatar, Card, SearchField, SectionTitle, StateView,
} from '@shared/components/ui';
import { FormHeader, Hint } from '@shared/ui/formParts';
import { PersonRow } from '@shared/ui/rows';
import { studentCodesApi } from '@shared/api/studentCodesApi';
import { useAuth } from '@features/auth/AuthContext';
import { StudentCodeCard } from '../StudentCodeCard';
import {
  classTitle, filterStudents, heroStatus, homeroomCaption, positionLabel, rosterSubtitle, rowStatus,
} from '../studentCodeModel';
import {
  useChildAccess, useHomeroomClasses, useHomeroomRoster, useTeacherStudentAccess,
} from '../useStudentCodes';

/**
 * Коды у классного руководителя и родителя — блок «Mobile · Коды» страницы `Admin_Admissions`.
 *
 * Учитель: профиль → «Классное руководство» → класс (2460:4192) → ученик (4292/4371/4460).
 * Родитель: профиль → «Мои дети» → ребёнок (4612). Сама карточка кода — `StudentCodeCard`.
 */

function toneColor(c, tone) {
  if (tone === 'success') return c.success;
  if (tone === 'orange') return c.amberInk;
  return c.inkMuted;
}

/** Шапка экранов кодов (2460:4192, 4292, 4612): «назад» 40, заголовок 16/700 и подпись под ним. */
function CodesHeader({ onBack, title, subtitle }) {
  return <FormHeader large={false} onBack={onBack} title={title} subtitle={subtitle} backSize={CODES.backSize} />;
}

function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: AUTH.sectionGap, alignItems: 'center' }}>
      <ActivityIndicator color={c.blue} />
    </View>
  );
}

function LoadError({ error, onRetry }) {
  return (
    <StateView
      icon="alertCircle"
      tone="error"
      title="Не удалось загрузить"
      subtitle={error?.message}
      actionLabel="Повторить"
      onAction={onRetry}
      style={{ paddingVertical: AUTH.sectionGap }}
    />
  );
}

/** Аватар 56/18, полное имя 18/700 и «входил ли» с точкой под ним (2460:4292, 4460, 4612). */
function StudentHero({ name, status }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: CODES.heroGap, paddingVertical: 4 }}>
      <Avatar
        name={name || ''}
        size={CODES.heroAvatar}
        variant="tile"
        color="blue"
        radius={CODES.heroRadius}
        textSize={CODES.heroInitials}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt numberOfLines={2} style={{ fontSize: CODES.heroNameSize, fontWeight: '700' }}>{name}</Txt>
        {status ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: toneColor(c, status.tone) }} />
            <Txt style={{ fontSize: AUTH.captionSize, color: toneColor(c, status.tone) }}>{status.text}</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Карточка на месте кода, когда выдавать его нельзя по праву, а не по состоянию аккаунта. */
function NoCodeCard({ text, hint }) {
  const { c } = useTheme();
  return (
    <Card style={{ padding: CODES.cardPad }}>
      <Txt style={{ fontSize: AUTH.captionSize, lineHeight: AUTH.captionLine, color: c.inkMuted }}>
        Персональный код
      </Txt>
      <Txt style={{ marginTop: 8, fontSize: AUTH.bodySize, lineHeight: AUTH.bodyLine }}>{text}</Txt>
      {hint ? <Hint>{hint}</Hint> : null}
    </Card>
  );
}

// ═══ Профиль учителя: «Классное руководство» (2460:4109) ═══

/**
 * Раздел профиля учителя. Без руководства в текущем году его нет совсем: пустой раздел
 * рассказывал бы предметнику о чужой роли. Не загрузился — тоже нет: это вход, а не данные,
 * и профиль не должен краснеть из-за него.
 */
export function HomeroomSection({ nav }) {
  const { data } = useHomeroomClasses();
  if (!data?.length) return null;
  return (
    <>
      <SectionTitle title="Классное руководство" />
      <Card padded={false} style={{ marginHorizontal: AUTH.gutter, marginBottom: 12, overflow: 'hidden' }}>
        {data.map((item, i) => (
          <PersonRow
            key={item.id}
            first={i === 0}
            name={classTitle(item.name)}
            status={homeroomCaption(item.count)}
            avatar={{ label: item.name, textSize: 12 }}
            onPress={() => nav('homeroom-class', { classId: item.id, className: item.name, count: item.count })}
          />
        ))}
      </Card>
    </>
  );
}

// ═══ Класс: список учеников (2460:4192) ═══

export function HomeroomClassScreen({ nav, payload }) {
  const bottomPad = useBottomChromePadding();
  const roster = useHomeroomRoster(payload?.classId);
  const [query, setQuery] = useState('');
  const rows = roster.data?.rows;
  const shown = useMemo(() => filterStudents(rows || [], query), [rows, query]);
  const total = roster.data?.total ?? payload?.count ?? null;

  let body;
  if (roster.loading) body = <Loading />;
  else if (!rows) body = <LoadError error={roster.error} onRetry={roster.reload} />;
  else if (rows.length === 0) {
    body = <StateView icon="users" title="В классе пока нет учеников" style={{ paddingVertical: AUTH.sectionGap }} />;
  } else if (shown.length === 0) {
    body = <Hint center>Никого не нашли — проверьте написание.</Hint>;
  } else {
    body = (
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {shown.map((row, i) => {
          const status = rowStatus(row.access);
          return (
            <PersonRow
              key={row.studentProfileId}
              first={i === 0}
              name={row.listName}
              status={status.text}
              tone={status.tone === 'orange' ? 'amber' : 'muted'}
              onPress={() => nav('homeroom-student', {
                studentProfileId: row.studentProfileId,
                listName: row.listName,
                fullName: row.fullName,
                className: payload?.className,
                index: rows.indexOf(row),
                total: rows.length,
              })}
            />
          );
        })}
      </Card>
    );
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <CodesHeader onBack={nav.back} title={classTitle(payload?.className)} subtitle={rosterSubtitle(total)} />
      <View style={{ paddingHorizontal: REQUEST.gutter, paddingBottom: bottomPad, gap: AUTH.gap }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Поиск ученика" />
        {body}
      </View>
    </Screen>
  );
}

// ═══ Ученик у классного руководителя (2460:4292, 4371, 4460) ═══

/**
 * Учебные блоки макета (средний балл, оценки, посещаемость) сюда не перенесены — это раздел
 * «Мой класс», а не код входа. Карточка кода — по разрешению администратора: без него экран
 * честно говорит, к кому идти, вместо кнопки, которая ответила бы отказом.
 */
export function HomeroomStudentScreen({ nav, payload }) {
  const bottomPad = useBottomChromePadding();
  const { token } = useAuth();
  const id = payload?.studentProfileId;
  const access = useTeacherStudentAccess(id);
  const issue = useCallback(
    (confirm) => studentCodesApi.issueForStudent(token, id, confirm),
    [token, id],
  );

  let body;
  if (access.loading) body = <Loading />;
  else if (access.data === undefined) body = <LoadError error={access.error} onRetry={access.reload} />;
  else if (access.data) {
    body = <StudentCodeCard access={access.data} audience="teacher" onIssue={issue} onChanged={access.reload} />;
  } else {
    body = (
      <NoCodeCard
        text="Администратор не открыл вам выдачу кода этому ученику."
        hint="Код выдаст администратор школы или родитель — в своём приложении."
      />
    );
  }

  return (
    <Screen>
      <CodesHeader
        onBack={nav.back}
        title={payload?.listName}
        subtitle={positionLabel(payload?.className, payload?.index, payload?.total)}
      />
      <View style={{ paddingHorizontal: REQUEST.gutter, paddingBottom: bottomPad, gap: AUTH.gap }}>
        <StudentHero name={payload?.fullName} status={heroStatus(access.data)} />
        {body}
      </View>
    </Screen>
  );
}

// ═══ Ребёнок у родителя (2460:4612) ═══

/**
 * Под именем в макете — «классный руководитель Марина Демо», но родительского эндпоинта с
 * классным руководителем нет; на этом месте тот же статус «входил ли», что у учителя.
 */
export function ChildCodeScreen({ nav, payload }) {
  const bottomPad = useBottomChromePadding();
  const { token } = useAuth();
  const id = payload?.studentProfileId;
  const access = useChildAccess(id);
  const issue = useCallback(
    (confirm) => studentCodesApi.issueForChild(token, id, confirm),
    [token, id],
  );
  const name = access.data?.fullName || payload?.fullName;
  const className = access.data?.className || payload?.className;

  let body;
  if (access.loading) body = <Loading />;
  else if (access.data === undefined) body = <LoadError error={access.error} onRetry={access.reload} />;
  else if (access.data) {
    body = <StudentCodeCard access={access.data} audience="parent" onIssue={issue} onChanged={access.reload} />;
  } else {
    body = (
      <NoCodeCard
        text="Школа сейчас не подтверждает связь с этим ребёнком — выдать ему код нельзя."
        hint="Если это ошибка, обратитесь к администратору школы."
      />
    );
  }

  return (
    <Screen>
      <CodesHeader onBack={nav.back} title={name} subtitle={className ? classTitle(className) : null} />
      <View style={{ paddingHorizontal: REQUEST.gutter, paddingBottom: bottomPad, gap: AUTH.gap }}>
        <StudentHero name={name} status={heroStatus(access.data)} />
        {body}
      </View>
    </Screen>
  );
}
