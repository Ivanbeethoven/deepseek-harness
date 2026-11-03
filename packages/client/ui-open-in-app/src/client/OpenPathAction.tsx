/** File association adapter for the shared file/directory opening control. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { SessionWorkspacePathApplication } from '@deepseek-ai/dsh-api-session-controller/types'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import type { OpenInAppPathAction } from './open-path.ts'
import type { OpenInAppOutcome } from './outcome.ts'
import { useFileApplications } from './file-applications.ts'
import { OpenTargetButton, type OpenTargetReporter } from './OpenTargetButton.tsx'
import styles from './OpenTargetButton.module.css'
import type { NS } from './locales.ts'

/** Desktop availability and the gesture carrier injected into both path controls. */
export interface OpenPathInjected extends OpenTargetReporter {
  hooks: {
    openInAppDesktop: ObservableSnapshot<boolean | null>
  }
  loadDesktop: () => Promise<void>
  openPath: (path: string, action: OpenInAppPathAction, application?: string) => Promise<OpenInAppOutcome>
  applications: (path: string, signal: AbortSignal) => Promise<readonly SessionWorkspacePathApplication[] | null>
}

/** Full props of the document-header contribution. */
export type OpenPathActionProps =
  PropsRuntime<'sidebar.right.tab.document.actions'>
  & PropsLocale<typeof NS>
  & InjectFace<OpenPathInjected>

/** File inputs shared by the document header and its unpreviewable state. */
type FileOpenTargetProps = Pick<OpenPathActionProps, 'absolutePath' | 'useOpenInAppDesktop' | 'loadDesktop' | 'openPath' | 'applications' | 'report' | 't'> & {
  empty?: boolean
}

/**
 * Resolve file associations and adapt operations without embedding platform behavior in the control.
 * @param props - verified file path, desktop query, native operations, and display variant.
 * @returns the shared opening control, or null without a desktop.
 */
export function FileOpenTarget(props: FileOpenTargetProps): ReactNode {
  const desktop = props.useOpenInAppDesktop(value => value)
  const association = useFileApplications(props.absolutePath, props.applications, desktop === true)
  useEffect(() => {
    if (desktop === null) void props.loadDesktop()
  }, [desktop, props.loadDesktop])
  /*
   * No host desktop means the file cannot be opened here — a phone browsing a remote
   * session, for example. That is exactly when a download is what the user wants, so offer
   * one instead of rendering nothing.
   */
  if (desktop !== true) {
    return (
      <a
        className={styles.main}
        href={`/ssh-bridge/file?p=${encodeURIComponent(props.absolutePath)}`}
        download
        title={props.t('path.download')}
      >
        {props.t('path.download')}
      </a>
    )
  }
  const { apps } = association
  return (
    <OpenTargetButton
      key={props.absolutePath} kind="file" applications={apps} defaultId={apps.find(app => app.default)?.id}
      loading={association.loading} failed={association.failed}
      prominent={props.empty === true} t={props.t}
      refresh={association.refresh} report={props.report}
      execute={operation => props.openPath(props.absolutePath, operation.kind === 'reveal' ? 'reveal' : 'open',
        operation.kind === 'application' ? operation.id : undefined)}
    />
  )
}

/**
 * Render the file adapter in the document header.
 * @param props - document owner inputs and injected opening capabilities.
 * @returns the shared split button.
 */
export function OpenPathAction(props: OpenPathActionProps): ReactNode {
  return <FileOpenTarget {...props} />
}
