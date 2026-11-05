import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { AUTH } from '@shared/theme/tokens';
import { Screen, useBottomChromePadding } from '@shared/components/Screen';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import {
  Avatar, Card, HexBadge, ScreenHeader, SectionTitle, StateView, TextField,
} from '@shared/components/ui';
import { Hint } from '@shared/ui/formParts';
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
  if (tone === 'orange') return c.greenDeep;
  return c.inkMuted;
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

/** Аватар, полное имя и «входил ли» под ним (2460:4292, 4460, 4612). */
function StudentHero({ name, status }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: AUTH.gutter, marginBottom: AUTH.gap }}>
      <Avatar name={name || ''} size={AUTH.heroAvatar} color="blue" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={2} style={{ fontSize: AUTH.valueSize, fontWeight: '700' }}>{name}</Txt>
        {status ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
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
    <Card style={{ marginHorizontal: AUTH.gutter }}>
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
  const { c } = useTheme();
  const { data } = useHomeroomClasses();
  if (!data?.length) return null;
  return (
    <>
      <SectionTitle title="Классное руководство" />
      <Card padded={false} style={{ marginHorizontal: AUTH.gutter, marginBottom: 12 }}>
        {data.map((item, i) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => nav('homeroom-class', { classId: item.id, className: item.name, count: item.count })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: i < data.length - 1 ? 1 : 0,
              borderBottomColor: c.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <HexBadge size={AUTH.avatarSize} fill={c.blue}>
              <Txt style={{ color: c.heroInk, fontSize: 11, fontWeight: '700' }}>{item.name}</Txt>
            </HexBadge>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>{classTitle(item.name)}</Txt>
              <Txt numberOfLines={1} style={{ fontSize: 12, color: c.ink3 }}>{homeroomCaption(item.count)}</Txt>
            </View>
            <Icon name="chevronRight" size={16} color={c.ink3} />
          </Pressable>
        ))}
      </Card>
    </>
  );
}

// ═══ Класс: список учеников (2460:4192) ═══

export function HomeroomClassScreen({ nav, payload }) {
  const { c } = useTheme();
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
      <Card padded={false}>
        {shown.map((row, i) => {
          const status = rowStatus(row.access);
          return (
            <Pressable
              key={row.studentProfileId}
              accessibilityRole="button"
              onPress={() => nav('homeroom-student', {
                studentProfileId: row.studentProfileId,
                listName: row.listName,
                fullName: row.fullName,
                className: payload?.className,
                index: rows.indexOf(row),
                total: rows.length,
              })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: i < shown.length - 1 ? 1 : 0,
                borderBottomColor: c.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Avatar name={row.listName} size={AUTH.avatarSize} color="blue" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={{ fontSize: AUTH.bodySize, fontWeight: '700' }}>{row.listName}</Txt>
                <Txt numberOfLines={1} style={{ fontSize: AUTH.captionSize, color: toneColor(c, status.tone) }}>
                  {status.text}
                </Txt>
              </View>
              <Icon name="chevronRight" size={16} color={c.ink3} />
            </Pressable>
          );
        })}
      </Card>
    );
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader inline back={nav.back} title={classTitle(payload?.className)} sub={rosterSubtitle(total)} />
      <View style={{ paddingHorizontal: AUTH.gutter, paddingBottom: bottomPad, gap: 12 }}>
        <View>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск ученика"
            returnKeyType="search"
            autoCorrect={false}
            inputStyle={{ paddingLeft: 42 }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 14 }}>
            <Icon name="search" size={18} color={c.ink3} />
          </View>
        </View>
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
      <ScreenHeader
        inline
        back={nav.back}
        title={payload?.listName}
        sub={positionLabel(payload?.className, payload?.index, payload?.total)}
      />
      <StudentHero name={payload?.fullName} status={heroStatus(access.data)} />
      <View style={{ paddingBottom: bottomPad }}>{body}</View>
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
      <ScreenHeader inline back={nav.back} title={name} sub={className ? classTitle(className) : null} />
      <StudentHero name={name} status={heroStatus(access.data)} />
      <View style={{ paddingBottom: bottomPad }}>{body}</View>
    </Screen>
  );
}
