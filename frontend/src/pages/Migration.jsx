import { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Loader,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Save,
  Trash2,
  Copy,
  Settings,
  ChevronRight,
  ChevronDown,
  Filter,
  Webhook,
  Calendar,
  Layers,
  Box,
  Leaf,
  CircleDot,
  Sparkles,
  Zap,
  ArrowLeftRight,
  Table2,
  GitBranch,
  Terminal,
  X,
  Check
} from 'lucide-react';
import apiService from '../services/api';
const api = apiService.api;
import toast from 'react-hot-toast';
import DBCredentialsModal from '../components/DBCredentialsModal';

const DatabaseIcon = ({ type, className = "w-5 h-5", showBg = false }) => {
  const config = {
    mysql: { 
      color: '#00758F', 
      bgColor: 'bg-[#00758F]/10',
      icon: (
        <svg className={className} viewBox="0 0 128 128" fill="currentColor">
          <path d="M116.948 97.807c-6.863-.187-12.104.452-16.585 2.341-1.273.537-3.305.552-3.513 2.147.7.733.807 1.83 1.355 2.731 1.049 1.725 2.826 4.027 4.419 5.232 1.74 1.317 3.547 2.725 5.452 3.858 3.388 2.016 7.166 3.168 10.432 5.163 1.925 1.178 3.841 2.662 5.711 4.03.932.683 1.554 1.746 2.678 2.206v-.251c-.617-.775-1.23-1.552-1.848-2.328-1.111-1.105-2.222-2.21-3.333-3.315-3.254-3.854-7.302-7.24-11.7-9.979-3.507-2.184-11.381-5.135-12.839-9.169 2.379-2.436 5.168-4.544 7.779-6.747 4.325-3.654 8.179-7.545 12.101-11.623 2.112-2.195 3.858-4.539 5.681-6.933 1.824-2.394 3.514-4.904 5.264-7.42 1.168-1.682 2.009-3.59 3.076-5.372.704-1.178 1.186-2.484 1.893-3.665.49-.818.991-1.636 1.491-2.454.313-.512.751-1.051 1.037-1.601-.203-.212-.366-.479-.614-.651-.844-.583-3.283.267-4.265.602-2.449.839-5.017 1.348-7.298 2.541-1.168.612-3.13 1.857-4.259 2.054-.362.065-.552-.212-.805-.429-.459-.393-.859-.849-1.259-1.305-1.059-1.21-2.168-2.405-3.367-3.493-3.011-2.72-6.314-5.096-9.918-7.165-2.029-1.164-4.537-1.926-6.735-2.846-.821-.344-2.15-.514-2.749-1.132-.564-.587-.946-1.39-1.385-2.088-1.752-2.783-3.496-5.863-4.862-8.86-1.016-2.227-1.676-4.432-2.485-6.728-.295-.836-.512-1.761-.816-2.627-.304-.866-.668-1.723-.957-2.577-.465-1.373-.826-2.835-1.372-4.225-.531-1.353-.928-2.799-1.503-4.13-1.035-2.399-2.071-4.798-3.107-7.198-.507-1.18-.994-2.369-1.599-3.503-1.061-1.981-2.291-3.895-3.561-5.738-1.271-1.843-2.644-3.731-4.101-5.406-1.458-1.675-3.063-3.26-4.764-4.734-1.7-1.474-3.462-2.833-5.346-4.094-.963-.644-1.945-1.262-2.944-1.854-.5-.296-1-.591-1.5-.887-.501-.296-.981-.632-1.487-.925-.506-.293-.979-.656-1.505-.926-.263-.135-.501-.324-.77-.445-.134-.06-.286-.084-.429-.127-.144-.043-.249-.151-.395-.183-.292-.065-.602-.086-.897-.128-.59-.084-1.194-.214-1.785-.3-.591-.086-1.191-.167-1.789-.218-.598-.051-1.205-.079-1.807-.083-.3-.002-.603.051-.904.063-.602.024-1.196-.017-1.795.051-.6.068-1.193.197-1.787.308-.594.111-1.177.257-1.764.395-.587.138-1.181.259-1.762.423-1.162.328-2.318.679-3.467 1.052-2.299.746-4.596 1.544-6.869 2.377-2.273.833-4.563 1.628-6.798 2.549-4.471 1.842-8.783 3.856-13.063 5.96-4.28 2.104-8.549 4.265-12.752 6.509-2.101 1.122-4.145 2.346-6.23 3.501-2.085 1.155-4.193 2.274-6.254 3.465-2.061 1.191-4.103 2.41-6.126 3.655-2.023 1.245-4.055 2.474-6.055 3.759-.999.642-1.998 1.284-2.997 1.926-.999.642-2.018 1.257-2.998 1.926-.98.669-1.943 1.364-2.899 2.068-.956.704-1.899 1.424-2.836 2.155-.937.731-1.872 1.464-2.797 2.209-.925.745-1.842 1.499-2.751 2.262-.909.763-1.819 1.524-2.713 2.303-.894.779-1.782 1.565-2.657 2.366-.875.801-1.749 1.602-2.606 2.421-.857.819-1.704 1.648-2.535 2.494-.831.846-1.651 1.702-2.453 2.576-.802.874-1.59 1.761-2.361 2.664-.771.903-1.534 1.813-2.275 2.741-.741.928-1.466 1.87-2.172 2.828-.706.958-1.396 1.929-2.066 2.916-.67.987-1.324 1.986-1.956 3.001-.632 1.015-1.243 2.043-1.834 3.085-.591 1.042-1.168 2.094-1.72 3.161-.552 1.067-1.084 2.146-1.59 3.238-.506 1.092-.992 2.195-1.452 3.311-.46 1.116-.895 2.244-1.305 3.384-.41 1.14-.797 2.291-1.157 3.453-.36 1.162-.696 2.335-1.004 3.518-.308 1.183-.592 2.376-.848 3.579-.256 1.203-.485 2.416-.687 3.637-.202 1.221-.379 2.451-.527 3.688-.148 1.237-.269 2.481-.363 3.731-.094 1.25-.161 2.505-.201 3.765-.04 1.26-.052 2.524-.037 3.79.015 1.266.058 2.534.129 3.802.071 1.268.169 2.535.295 3.8.126 1.265.279 2.528.459 3.787.18 1.259.388 2.513.622 3.762.234 1.249.495 2.492.781 3.729.286 1.237.599 2.466.937 3.689.338 1.223.702 2.438 1.09 3.645.388 1.207.8 2.406 1.238 3.595.438 1.189.9 2.368 1.387 3.538.487 1.17.999 2.329 1.535 3.477.536 1.148 1.097 2.285 1.682 3.41.585 1.125 1.193 2.238 1.826 3.338.633 1.1 1.289 2.187 1.969 3.261.68 1.074 1.384 2.134 2.111 3.179.727 1.045 1.477 2.076 2.25 3.092.773 1.016 1.57 2.016 2.389 3.001.819.985 1.66 1.954 2.524 2.906.864.952 1.75 1.888 2.657 2.806.907.918 1.836 1.818 2.786 2.7.95.882 1.92 1.745 2.912 2.589.992.844 2.003 1.669 3.035 2.474 1.032.805 2.083 1.59 3.153 2.354 1.07.764 2.158 1.508 3.264 2.23 1.106.722 2.23 1.422 3.371 2.101 1.141.679 2.298 1.336 3.472 1.969 1.174.633 2.363 1.244 3.568 1.832 1.205.588 2.424 1.152 3.658 1.693 1.234.541 2.481 1.058 3.742 1.551 1.261.493 2.534.962 3.82 1.406 1.286.444 2.584.864 3.893 1.258 1.309.394 2.628.763 3.958 1.107 1.33.344 2.67.662 4.018.955 1.348.293 2.704.56 4.067.801 1.363.241 2.732.456 4.107.644 1.375.188 2.755.35 4.139.486 1.384.136 2.772.245 4.163.327 1.391.082 2.784.137 4.179.166 1.395.029 2.79.031 4.186.006 1.396-.025 2.791-.077 4.184-.155 1.393-.078 2.783-.183 4.17-.314 1.387-.131 2.77-.288 4.148-.471 1.378-.183 2.75-.392 4.116-.627 1.366-.235 2.726-.496 4.078-.783 1.352-.287 2.697-.6 4.033-.939 1.336-.339 2.663-.704 3.981-1.095 1.318-.391 2.627-.808 3.925-1.251 1.298-.443 2.586-.912 3.863-1.406 1.277-.494 2.543-1.014 3.797-1.559 1.254-.545 2.496-1.116 3.725-1.711 1.229-.595 2.446-1.216 3.649-1.861 1.203-.645 2.393-1.315 3.569-2.009 1.176-.694 2.338-1.413 3.486-2.156 1.148-.743 2.282-1.51 3.401-2.301 1.119-.791 2.224-1.606 3.313-2.444 1.089-.838 2.163-1.7 3.221-2.585 1.058-.885 2.1-1.793 3.126-2.724 1.026-.931 2.036-1.885 3.029-2.861.993-.976 1.97-1.975 2.929-2.996.959-1.021 1.901-2.064 2.825-3.129.924-1.065 1.831-2.152 2.719-3.26.888-1.108 1.759-2.237 2.611-3.387.852-1.15 1.685-2.32 2.5-3.51.815-1.19 1.612-2.4 2.389-3.629.777-1.229 1.535-2.477 2.274-3.744.739-1.267 1.459-2.552 2.159-3.855.7-1.303 1.38-2.623 2.04-3.961.66-1.338 1.301-2.693 1.921-4.064.62-1.371 1.22-2.758 1.799-4.161.579-1.403 1.138-2.821 1.675-4.254.537-1.433 1.053-2.88 1.548-4.342.495-1.462.968-2.938 1.42-4.427.452-1.489.882-2.991 1.29-4.506.408-1.515.794-3.043 1.158-4.583.364-1.54.706-3.092 1.025-4.656.319-1.564.616-3.14.89-4.726.274-1.586.525-3.183.753-4.79.228-1.607.434-3.224.616-4.85.182-1.626.341-3.261.477-4.904.136-1.643.248-3.294.337-4.952.089-1.658.155-3.323.197-4.994.042-1.671.06-3.348.055-5.029-.005-1.681-.034-3.366-.087-5.054-.053-1.688-.13-3.379-.231-5.071-.101-1.692-.226-3.386-.374-5.08-.148-1.694-.32-3.388-.516-5.08-.196-1.692-.415-3.383-.658-5.071-.243-1.688-.509-3.373-.798-5.054-.289-1.681-.602-3.358-.937-5.029-.335-1.671-.693-3.337-1.074-4.996-.381-1.659-.785-3.312-1.212-4.957-.427-1.645-.876-3.282-1.348-4.911-.472-1.629-.967-3.249-1.484-4.859-.517-1.61-1.057-3.21-1.619-4.8-.562-1.59-1.147-3.17-1.754-4.738-.607-1.568-1.236-3.125-1.887-4.67-.651-1.545-1.324-3.078-2.019-4.599-.695-1.521-1.412-3.029-2.15-4.524-.738-1.495-1.498-2.977-2.28-4.446-.782-1.469-1.585-2.925-2.409-4.367-.824-1.442-1.67-2.87-2.537-4.284-.867-1.414-1.755-2.814-2.663-4.2-.908-1.386-1.838-2.757-2.787-4.114-.949-1.357-1.919-2.699-2.909-4.027-.99-1.328-2-2.641-3.029-3.94-1.029-1.299-2.078-2.582-3.147-3.851-1.069-1.269-2.157-2.522-3.263-3.761-1.106-1.239-2.231-2.462-3.374-3.67-1.143-1.208-2.304-2.4-3.483-3.577-1.179-1.177-2.375-2.338-3.589-3.484-1.214-1.146-2.445-2.275-3.693-3.389-1.248-1.114-2.513-2.212-3.794-3.293-1.281-1.081-2.578-2.146-3.891-3.194-1.313-1.048-2.642-2.079-3.986-3.093-1.344-1.014-2.703-2.011-4.077-2.991-1.374-.98-2.762-1.943-4.165-2.888-1.403-.945-2.82-1.873-4.251-2.783-1.431-.91-2.875-1.802-4.333-2.677-1.458-.875-2.929-1.731-4.413-2.57-1.484-.839-2.98-1.66-4.489-2.463-1.509-.803-3.03-1.588-4.563-2.355-1.533-.767-3.078-1.516-4.634-2.246-1.556-.73-3.123-1.442-4.702-2.135-1.579-.693-3.168-1.368-4.768-2.024-1.6-.656-3.21-1.293-4.83-1.911-1.62-.618-3.25-1.217-4.889-1.797-1.639-.58-3.287-1.141-4.944-1.683-1.657-.542-3.322-1.065-4.996-1.569-1.674-.504-3.356-.989-5.045-1.454-1.689-.465-3.386-.911-5.089-1.338-1.703-.427-3.413-.835-5.13-1.223-1.717-.388-3.44-.757-5.169-1.107-1.729-.35-3.464-.68-5.204-.991-1.74-.311-3.485-.603-5.235-.876-1.75-.273-3.504-.527-5.262-.761-1.758-.234-3.52-.449-5.286-.644-1.766-.195-3.535-.371-5.307-.527-1.772-.156-3.547-.293-5.324-.41-1.777-.117-3.556-.214-5.337-.292-1.781-.078-3.563-.136-5.346-.175-1.783-.039-3.567-.058-5.351-.058-1.784 0-3.568.019-5.351.058-1.783.039-3.565.097-5.346.175-1.781.078-3.56.175-5.337.292-1.777.117-3.552.254-5.324.41-1.772.156-3.541.332-5.307.527-1.766.195-3.528.41-5.286.644-1.758.234-3.512.488-5.262.761-1.75.273-3.495.565-5.235.876-1.74.311-3.475.641-5.204.991-1.729.35-3.452.719-5.169 1.107-1.717.388-3.427.796-5.13 1.223-1.703.427-3.4.873-5.089 1.338-1.689.465-3.371.95-5.045 1.454-1.674.504-3.339 1.027-4.996 1.569-1.657.542-3.305 1.103-4.944 1.683-1.639.58-3.269 1.179-4.889 1.797-1.62.618-3.23 1.255-4.83 1.911-1.6.656-3.189 1.331-4.768 2.024-1.579.693-3.146 1.405-4.702 2.135-1.556.73-3.101 1.479-4.634 2.246-1.533.767-3.054 1.552-4.563 2.355-1.509.803-3.005 1.624-4.489 2.463-1.484.839-2.955 1.695-4.413 2.57-1.458.875-2.902 1.767-4.333 2.677-1.431.91-2.848 1.838-4.251 2.783-1.403.945-2.791 1.908-4.165 2.888-1.374.98-2.733 1.977-4.077 2.991-1.344 1.014-2.673 2.045-3.986 3.093-1.313 1.048-2.61 2.113-3.891 3.194-1.281 1.081-2.546 2.179-3.794 3.293-1.248 1.114-2.479 2.243-3.693 3.389-1.214 1.146-2.41 2.307-3.589 3.484-1.179 1.177-2.34 2.369-3.483 3.577-1.143 1.208-2.268 2.431-3.374 3.67-1.106 1.239-2.194 2.492-3.263 3.761-1.069 1.269-2.118 2.552-3.147 3.851-1.029 1.299-2.039 2.612-3.029 3.94-.99 1.328-1.96 2.67-2.909 4.027-.949 1.357-1.879 2.728-2.787 4.114-.908 1.386-1.796 2.786-2.663 4.2-.867 1.414-1.713 2.842-2.537 4.284-.824 1.442-1.627 2.898-2.409 4.367-.782 1.469-1.542 2.951-2.28 4.446-.738 1.495-1.455 3.003-2.15 4.524-.695 1.521-1.368 3.054-2.019 4.599-.651 1.545-1.28 3.102-1.887 4.67-.607 1.568-1.192 3.148-1.754 4.738-.562 1.59-1.102 3.19-1.619 4.8-.517 1.61-1.012 3.23-1.484 4.859-.472 1.629-.921 3.266-1.348 4.911-.427 1.645-.831 3.298-1.212 4.957-.381 1.659-.739 3.325-1.074 4.996-.335 1.671-.648 3.348-.937 5.029-.289 1.681-.555 3.366-.798 5.054-.243 1.688-.462 3.379-.658 5.071-.196 1.692-.368 3.386-.516 5.08-.148 1.694-.273 3.388-.374 5.08-.101 1.692-.178 3.383-.231 5.071-.053 1.688-.082 3.373-.087 5.054-.005 1.681.013 3.358.055 5.029.042 1.671.108 3.336.197 4.994.089 1.658.201 3.309.337 4.952.136 1.643.295 3.278.477 4.904.182 1.626.388 3.243.616 4.85.228 1.607.479 3.204.753 4.79.274 1.586.571 3.162.89 4.726.319 1.564.661 3.116 1.025 4.656.364 1.54.75 3.068 1.158 4.583.408 1.515.838 3.017 1.29 4.506.452 1.489.925 2.965 1.42 4.427.495 1.462 1.011 2.909 1.548 4.342.537 1.433 1.096 2.851 1.675 4.254.579 1.403 1.179 2.79 1.799 4.161.62 1.371 1.261 2.726 1.921 4.064.66 1.338 1.34 2.658 2.04 3.961.7 1.303 1.42 2.588 2.159 3.855.739 1.267 1.497 2.515 2.274 3.744.777 1.229 1.574 2.439 2.389 3.629.815 1.19 1.648 2.36 2.5 3.51.852 1.15 1.723 2.279 2.611 3.387.888 1.108 1.795 2.195 2.719 3.26.924 1.065 1.866 2.108 2.825 3.129.959 1.021 1.936 2.02 2.929 2.996.993.976 2.003 1.93 3.029 2.861 1.026.931 2.068 1.839 3.126 2.724 1.058.885 2.132 1.747 3.221 2.585 1.089.838 2.194 1.653 3.313 2.444 1.119.791 2.253 1.558 3.401 2.301 1.148.743 2.31 1.462 3.486 2.156 1.176.694 2.366 1.364 3.569 2.009 1.203.645 2.42 1.266 3.649 1.861 1.229.595 2.471 1.166 3.725 1.711 1.254.545 2.52 1.065 3.797 1.559 1.277.494 2.565.963 3.863 1.406 1.298.443 2.607.86 3.925 1.251 1.318.391 2.645.756 3.981 1.095 1.336.339 2.681.652 4.033.939 1.352.287 2.712.548 4.078.783 1.366.235 2.738.444 4.116.627 1.378.183 2.761.34 4.148.471 1.387.131 2.777.236 4.17.314 1.393.078 2.788.13 4.184.155 1.396.025 2.791.023 4.186-.006 1.395-.029 2.788-.084 4.179-.166 1.391-.082 2.779-.191 4.163-.327 1.384-.136 2.764-.298 4.139-.486 1.375-.188 2.744-.403 4.107-.644 1.363-.241 2.719-.508 4.067-.801 1.348-.293 2.688-.612 4.018-.955 1.33-.344 2.649-.713 3.958-1.107 1.309-.394 2.607-.814 3.893-1.258 1.286-.444 2.559-.913 3.82-1.406 1.261-.493 2.508-1.01 3.742-1.551 1.234-.541 2.453-1.105 3.658-1.693 1.205-.588 2.394-1.199 3.568-1.832 1.174-.633 2.331-1.29 3.472-1.969 1.141-.679 2.265-1.379 3.371-2.101 1.106-.722 2.194-1.466 3.264-2.23 1.07-.764 2.121-1.549 3.153-2.354 1.032-.805 2.043-1.63 3.035-2.474.992-.844 1.963-1.707 2.912-2.589.95-.882 1.879-1.782 2.786-2.7.907-.918 1.793-1.854 2.657-2.806.864-.952 1.705-1.921 2.524-2.906.819-.985 1.616-1.985 2.389-3.001.773-1.016 1.523-2.047 2.25-3.092.727-1.045 1.431-2.105 2.111-3.179.68-1.074 1.336-2.161 1.969-3.261.633-1.1 1.241-2.213 1.826-3.338.585-1.125 1.146-2.262 1.682-3.41.536-1.148 1.048-2.307 1.535-3.477.487-1.17.949-2.349 1.387-3.538.438-1.189.85-2.388 1.238-3.595.388-1.207.752-2.422 1.09-3.645.338-1.223.651-2.452.937-3.689.286-1.237.547-2.48.781-3.729.234-1.249.442-2.503.622-3.762.18-1.259.333-2.522.459-3.787.126-1.265.224-2.532.295-3.8.071-1.268.114-2.536.129-3.802.015-1.266-.003-2.53-.037-3.79-.034-1.26-.107-2.515-.201-3.765-.094-1.25-.215-2.494-.363-3.731-.148-1.237-.325-2.467-.527-3.688-.202-1.221-.425-2.434-.687-3.637-.262-1.203-.48-2.396-.736-3.579-.256-1.183-.54-2.356-.848-3.518-.308-1.162-.597-2.335-.904-3.518-.307-1.183-.618-2.375-.968-3.549-.35-1.174-.693-2.369-1.11-3.519-3.019-8.341-9.212-14.766-18.167-18.316-4.48-1.889-9.721-2.528-16.584-2.341z"/>
        </svg>
      )
    },
    postgresql: { 
      color: '#336791', 
      bgColor: 'bg-[#336791]/10',
      icon: (
        <svg className={className} viewBox="0 0 128 128" fill="currentColor">
          <path d="M93.809 92.112c.785-6.533.55-7.492 5.416-6.433l1.235.108c3.742.17 8.637-.602 11.513-1.938 6.191-2.873 9.861-7.668 3.758-6.409-13.924 2.873-14.881-1.842-14.881-1.842 14.703-21.815 20.849-49.508 15.545-56.287-14.47-18.489-39.517-9.746-39.936-9.52l-.134.025c-2.751-.571-5.83-.912-9.289-.968-6.301-.104-11.082 1.652-14.709 4.402 0 0-44.683-18.409-42.604 23.151.442 8.841 12.672 66.898 27.26 49.362 5.332-6.412 10.483-11.834 10.483-11.834 2.559 1.699 5.622 2.567 8.834 2.255l.249-.212c-.078.796-.044 1.575.099 2.497-3.757 4.199-2.653 4.936-10.166 6.482-7.602 1.566-3.136 4.355-.221 5.084 3.535.884 11.712 2.136 17.238-5.598l-.22.882c1.473 1.18 1.296 8.614 1.493 13.918.197 5.304.553 10.199 1.39 13.134.836 2.935 1.979 5.569 4.699 6.909 2.313 1.139 5.496 1.658 9.044 1.436 5.818-.364 9.62-1.873 11.637-3.715 2.016-1.842 2.852-4.09 2.852-6.742 0-2.652-.418-5.566-1.095-9.137-.677-3.571-.928-6.067-.928-9.161 0-1.542.052-3.166.387-4.782.336-1.616.94-3.271 1.918-4.895 3.096 3.447 8.293 4.837 15.547 3.955 4.048-.488 6.611-1.375 8.479-2.453 1.867-1.078 3.039-2.347 3.797-3.687.758-1.34 1.103-2.751 1.236-4.103.133-1.352.054-2.645-.137-3.842z"/>
        </svg>
      )
    },
    sqlite: { 
      color: '#003B57', 
      bgColor: 'bg-[#003B57]/10',
      icon: <Box className={className} />
    },
    mongodb: { 
      color: '#47A248', 
      bgColor: 'bg-[#47A248]/10',
      icon: <Leaf className={className} />
    }
  };
  
  const dbConfig = config[type?.toLowerCase()] || { color: '#6B7280', bgColor: 'bg-gray-500/10', icon: <Database className={className} /> };
  
  if (showBg) {
    return (
      <div className={`p-2 rounded-xl ${dbConfig.bgColor}`} style={{ color: dbConfig.color }}>
        {dbConfig.icon}
      </div>
    );
  }
  
  return <span style={{ color: dbConfig.color }}>{dbConfig.icon}</span>;
};

const GlassCard = ({ children, className = "", gradient = false, hover = true }) => (
  <div className={`
    relative overflow-hidden
    bg-white/80 dark:bg-[#1a1a2e]/80 
    backdrop-blur-xl 
    border border-white/20 dark:border-white/10
    rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20
    ${hover ? 'hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-300' : ''}
    ${gradient ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:pointer-events-none' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const ProgressRing = ({ progress, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-blue-500 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[var(--fg-primary)]">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

const Skeleton = ({ className = "" }) => (
  <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  </div>
);

const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {steps.map((step, index) => {
      const StepIcon = step.icon;
      const isCompleted = currentStep > step.id;
      const isCurrent = currentStep === step.id;
      
      return (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`
              relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500
              ${isCompleted 
                ? 'bg-[#059669] text-white shadow-lg' 
                : isCurrent 
                  ? 'bg-[#2563EB] text-white shadow-lg scale-110' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
            `}>
              {isCompleted ? (
                <Check className="w-6 h-6" />
              ) : (
                <StepIcon className="w-6 h-6" />
              )}
              {isCurrent && (
                <div className="absolute inset-0 rounded-2xl animate-ping bg-blue-400/30" />
              )}
            </div>
            <span className={`mt-2 text-xs font-semibold transition-colors ${
              isCurrent ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {step.name}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-1 mx-3 rounded-full transition-colors duration-500 ${
              isCompleted ? 'bg-[#059669]' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </div>
      );
    })}
  </div>
);

const MIGRATION_STEPS = [
  { id: 1, name: 'Source', icon: Database },
  { id: 2, name: 'Target', icon: ArrowRight },
  { id: 3, name: 'Tables', icon: Table2 },
  { id: 4, name: 'Execute', icon: Zap },
];

export default function Migration() {
  const [connections, setConnections] = useState([]);
  const [sourceId, setSourceId] = useState(null);
  const [targetDbType, setTargetDbType] = useState('sqlite');
  const [sourceTables, setSourceTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [migrationName, setMigrationName] = useState('');
  const [dropIfExists, setDropIfExists] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [migrations, setMigrations] = useState([]);
  const [activeMigration, setActiveMigration] = useState(null);
  const [showLogs, setShowLogs] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [migrationType, setMigrationType] = useState('full');
  const [isDryRun, setIsDryRun] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [liveLogsOpen, setLiveLogsOpen] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [pendingMigrationData, setPendingMigrationData] = useState(null);

  const logsEndRef = useRef(null);
  const stopPollingRef = useRef(false);

  useEffect(() => {
    fetchConnections();
    fetchMigrations();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (!activeMigration || 
        ['completed', 'failed', 'rolled_back', 'cancelled'].includes(activeMigration.status)) {
      return;
    }

    const interval = setInterval(() => {
      fetchMigrationStatus(activeMigration.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeMigration?.id, activeMigration?.status]);

  useEffect(() => {
    if (logsEndRef.current && liveLogsOpen) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, liveLogsOpen]);

  useEffect(() => {
    if (!sourceId) setCurrentStep(1);
    else if (!targetDbType) setCurrentStep(2);
    else if (selectedTables.length === 0) setCurrentStep(3);
    else setCurrentStep(4);
  }, [sourceId, targetDbType, selectedTables]);

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true);
      const response = await api.get('/databases/');
      setConnections(response.data);
    } catch (err) {
      toast.error('Failed to load connections');
    } finally {
      setLoadingConnections(false);
    }
  };

  const fetchMigrations = async () => {
    try {
      const response = await api.get('/migrations/');
      setMigrations(response.data?.items ?? response.data ?? []);
    } catch (err) {
      console.error('Failed to load migrations:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/migrations/templates/');
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const fetchSourceTables = async (connectionId) => {
    try {
      setLoading(true);
      const response = await api.get(`/migrations/source/${connectionId}/tables`);
      setSourceTables(response.data.tables || []);
      setSelectedTables([]);
    } catch (err) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchMigrationStatus = async (migrationId) => {
    if (stopPollingRef.current) return;
    try {
      const response = await api.get(`/migrations/${migrationId}`, {
        validateStatus: (status) => status === 200 || status === 404,
      });
      if (response.status === 404) {
        stopPollingRef.current = true;
        setActiveMigration(null);
        setLogs([{ message: 'Migration was rolled back or no longer exists.', level: 'info' }]);
        fetchMigrations();
        toast.error('Migration was rolled back or no longer exists.');
        return;
      }
      const migration = response.data;
      const statusChanged = !activeMigration || activeMigration.status !== migration.status;
      setActiveMigration(migration);

      if (liveLogsOpen) {
        const logsResponse = await api.get(`/migrations/${migrationId}/logs`);
        const logList = logsResponse.data.logs || [];
        setLogs(logList);
        if (import.meta.env.DEV && logList.length > 0) console.log('[Migration] Logs', migrationId, logList.length);
      }

      if (statusChanged && ['completed', 'failed'].includes(migration.status)) {
        fetchMigrations();
        toast[migration.status === 'completed' ? 'success' : 'error'](
          migration.status === 'completed' ? 'Migration completed!' : 'Migration failed'
        );
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Migration] Failed to fetch status', migrationId, err?.response?.status, err?.response?.data);
    }
  };

  const fetchMigrationLogs = async (migrationId) => {
    try {
      const response = await api.get(`/migrations/${migrationId}/logs`);
      setLogs(response.data.logs || []);
      setShowLogs(migrationId);
    } catch (err) {
      toast.error('Failed to load logs');
    }
  };

  const handleSourceChange = (id) => {
    setSourceId(id);
    if (id) fetchSourceTables(id);
    else {
      setSourceTables([]);
      setSelectedTables([]);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTables(prev => 
      prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]
    );
  };

  const handleSelectAll = () => {
    setSelectedTables(
      selectedTables.length === sourceTables.length ? [] : sourceTables.map(t => t.name)
    );
  };

  const handlePreview = async () => {
    toast.error('Preview is not available when creating a new target database. Run the migration to see the result.');
  };

  const runCreateNewTarget = async (username, password) => {
    const payload = {
      source_connection_id: sourceId,
      target_db_type: targetDbType,
      migration_name: migrationName,
      selected_tables: selectedTables,
      drop_if_exists: dropIfExists,
      migration_type: migrationType,
      is_dry_run: isDryRun,
      webhook_url: webhookUrl || null,
      notify_on_complete: false,
      notify_on_failure: true,
    };
    if (typeof username === 'string' && username.trim()) payload.username = username.trim();
    if (typeof password === 'string') payload.password = password;
    const response = await api.post('/migrations/create-new-target', payload);
    return response.data;
  };

  const handleStartMigration = async (username = null, password = null) => {
    if (!sourceId || !targetDbType || selectedTables.length === 0 || !migrationName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const data = await runCreateNewTarget(username, password);
      stopPollingRef.current = false;
      setActiveMigration(data);
      setLiveLogsOpen(true);
      setShowCredentialsModal(false);
      setPendingMigrationData(null);
      if (import.meta.env.DEV) console.log('[Migration] Started', data?.id, data?.status);
      toast.success('Migration started! A new target database will be created.');
    } catch (err) {
      const res = err.response;
      const detail = res?.data?.detail;
      if (res?.status === 400 && detail?.code === 'CREDENTIALS_REQUIRED') {
        setPendingMigrationData({});
        setShowCredentialsModal(true);
      } else {
        const msg = (detail && (typeof detail === 'string' ? detail : detail.message))
          || (Array.isArray(detail) && detail[0]?.msg ? detail.map(d => d.msg).join('; ') : null)
          || 'Failed to start migration';
        console.error('[Migration] Start failed', res?.status, res?.data ? { detail: res.data.detail } : null, err?.message);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationCredentialsConfirm = async (username, password) => {
    try {
      setLoading(true);
      const data = await runCreateNewTarget(username, password);
      stopPollingRef.current = false;
      setActiveMigration(data);
      setLiveLogsOpen(true);
      setShowCredentialsModal(false);
      setPendingMigrationData(null);
      if (import.meta.env.DEV) console.log('[Migration] Started (with credentials)', data?.id, data?.status);
      toast.success('Migration started! A new target database will be created.');
    } catch (err) {
      const res = err.response;
      const detail = res?.data?.detail;
      const msg = (detail && (typeof detail === 'string' ? detail : detail.message))
        || (Array.isArray(detail) && detail[0]?.msg ? detail.map(d => d.msg).join('; ') : null)
        || 'Failed to start migration';
      console.error('[Migration] Start failed (credentials)', res?.status, res?.data ? { detail: res.data.detail } : null, err?.message);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMigration = async (migrationId) => {
    try {
      await api.post(`/migrations/${migrationId}/cancel`);
      toast.success('Cancellation requested');
      fetchMigrationStatus(migrationId);
    } catch (err) {
      toast.error('Failed to cancel migration');
    }
  };

  const handleRollback = async (migrationId) => {
    if (!confirm('Rollback this migration? This will restore the target database to its pre-migration state.')) return;
    
    try {
      await api.post(`/migrations/${migrationId}/rollback`);
      toast.success('Rollback started');
      fetchMigrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to rollback');
    }
  };

  const handleSaveTemplate = async () => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;
    
    try {
      await api.post('/migrations/templates/', {
        name: templateName,
        source_connection_id: sourceId,
        target_connection_id: null,
        target_db_type: targetDbType,
        selected_tables: selectedTables,
        drop_if_exists: dropIfExists,
        migration_type: migrationType,
        webhook_url: webhookUrl || null
      });
      toast.success('Template saved!');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to save template');
    }
  };

  const handleLoadTemplate = (template) => {
    setSourceId(template.source_connection_id);
    if (template.target_db_type) {
      setTargetDbType(template.target_db_type);
    } else if (template.target_connection_id) {
      const conn = connections.find(c => c.id === template.target_connection_id);
      if (conn) setTargetDbType(conn.db_type);
    }
    setSelectedTables(template.selected_tables || []);
    setDropIfExists(template.drop_if_exists);
    setMigrationType(template.migration_type || 'full');
    setWebhookUrl(template.webhook_url || '');
    setShowTemplates(false);
    
    if (template.source_connection_id) fetchSourceTables(template.source_connection_id);
    toast.success('Template loaded');
  };

  const getStatusBadge = (status) => {
    const configs = {
      completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
      failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
      rolled_back: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: RotateCcw },
      in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Loader },
      cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: XCircle },
      pending: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', icon: Clock }
    };
    
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const sourceConn = connections.find(c => c.id === sourceId);

  return (
    <div className="min-h-screen bg-primary p-6 lg:p-8">
      {
}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-[#2563EB] text-white shadow-lg">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-secondary">
                Database Migration
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 ml-14">Seamlessly migrate schema and data between databases</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-gray-700 dark:text-gray-200 shadow-sm"
            >
              <Copy className="w-4 h-4" />
              Templates
            </button>
            {selectedTables.length > 0 && (
              <button
                onClick={handleSaveTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl transition-all"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            )}
          </div>
        </div>
      </div>

      {
}
      {showTemplates && templates.length > 0 && (
        <GlassCard className="mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Saved Templates
            </h3>
            <button type="button" onClick={() => setShowTemplates(false)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleLoadTemplate(template)}
                className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-left transition-all group"
              >
                <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{template.name}</div>
                <div className="text-sm text-gray-500 mt-1">{template.selected_tables?.length || 0} tables</div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {
}
      <StepIndicator steps={MIGRATION_STEPS} currentStep={currentStep} />

      {
}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {
}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {
}
          <GlassCard className="p-6" gradient>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Source Database</h3>
            </div>
            
            {loadingConnections ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <select
                value={sourceId || ''}
                onChange={(e) => handleSourceChange(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
              >
                <option value="">Select source database</option>
                {connections.map(conn => (
                  <option key={conn.id} value={conn.id}>{conn.name} ({conn.db_type})</option>
                ))}
              </select>
            )}

            {sourceConn && (
              <div className="mt-4 p-4 bg-[#2563EB]/10 rounded-xl border border-blue-200/50 dark:border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <DatabaseIcon type={sourceConn.db_type} className="w-8 h-8" showBg />
                  <span className="font-bold text-gray-900 dark:text-white">{sourceConn.db_type.toUpperCase()}</span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Host:</span> {sourceConn.host}:{sourceConn.port}</p>
                  <p><span className="font-medium">Database:</span> {sourceConn.database_name}</p>
                </div>
              </div>
            )}
          </GlassCard>

          {
}
          <GlassCard className="p-6" gradient>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Database className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Target DB Type</h3>
            </div>
            
            <select
              value={targetDbType}
              onChange={(e) => setTargetDbType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
            >
              <option value="sqlite">SQLite</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mongodb">MongoDB</option>
            </select>

            <div className="mt-4 p-4 bg-[#059669]/10 rounded-xl border border-green-200/50 dark:border-green-500/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                A new database will be created with name <strong>migrated_&lt;source&gt;_&lt;timestamp&gt;</strong> and migration will run into it.
              </p>
            </div>
          </GlassCard>
        </div>

        {
}
        {sourceId && targetDbType && (
          <GlassCard className="p-6 flex flex-col items-center justify-center" gradient>
            <div className="text-center mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Migration Flow</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <DatabaseIcon type={sourceConn?.db_type} className="w-12 h-12" showBg />
                  <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{sourceConn?.db_type}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="w-8 h-8 text-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">migrate</span>
                </div>
                <div className="flex flex-col items-center">
                  <DatabaseIcon type={targetDbType} className="w-12 h-12" showBg />
                  <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">new {targetDbType}</span>
                </div>
              </div>
            </div>
            
            {selectedTables.length > 0 && (
              <div className="w-full pt-4 border-t border-gray-200 dark:border-white/10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{selectedTables.length}</div>
                  <div className="text-sm text-gray-500">tables selected</div>
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {
}
      {(loading && sourceTables.length === 0) ? (
        <GlassCard className="p-6 mb-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </GlassCard>
      ) : sourceTables.length > 0 && (
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10">
                <Table2 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Tables</h3>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              {selectedTables.length === sourceTables.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2">
            {sourceTables.map(table => (
              <label
                key={table.name}
                className={`
                  flex items-center p-4 rounded-xl cursor-pointer transition-all border-2
                  ${selectedTables.includes(table.name)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                    : 'border-transparent bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table.name)}
                  onChange={() => handleTableSelect(table.name)}
                  className="sr-only"
                />
                <div className={`
                  w-5 h-5 rounded-lg border-2 flex items-center justify-center mr-3 transition-all
                  ${selectedTables.includes(table.name)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 dark:border-gray-600'}
                `}>
                  {selectedTables.includes(table.name) && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{table.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{table.row_count.toLocaleString()} rows</span>
                    {table.has_foreign_keys && (
                      <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded">FK</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900 dark:text-white">{selectedTables.length}</span> of {sourceTables.length} tables selected
            </span>
          </div>
        </GlassCard>
      )}

      {
}
      {selectedTables.length > 0 && (
        <GlassCard className="p-6 mb-6" gradient>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-orange-500/20 dark:bg-orange-500/30">
              <Settings className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Migration Name</label>
              <input
                type="text"
                value={migrationName}
                onChange={(e) => setMigrationName(e.target.value)}
                placeholder="e.g., Production to Staging"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Migration Type</label>
              <select
                value={migrationType}
                onChange={(e) => setMigrationType(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="full">Full (Schema + Data)</option>
                <option value="schema_only">Schema Only</option>
                <option value="incremental">Incremental Sync</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mb-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${dropIfExists ? 'bg-blue-500 border-blue-500' : 'border-gray-400 dark:border-gray-500 group-hover:border-blue-400'}`}>
                {dropIfExists && <Check className="w-4 h-4 text-white" />}
              </div>
              <input type="checkbox" checked={dropIfExists} onChange={(e) => setDropIfExists(e.target.checked)} className="sr-only" />
              <span className="text-gray-800 dark:text-gray-200">Drop existing tables</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isDryRun ? 'bg-purple-500 border-purple-500' : 'border-gray-400 dark:border-gray-500 group-hover:border-purple-400'}`}>
                {isDryRun && <Check className="w-4 h-4 text-white" />}
              </div>
              <input type="checkbox" checked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)} className="sr-only" />
              <span className="text-gray-800 dark:text-gray-200">Dry run (preview only)</span>
            </label>
          </div>

          {dropIfExists && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-xl mb-6">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Warning:</strong> Existing tables will be permanently deleted before migration.
              </p>
            </div>
          )}

          {
}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 cursor-pointer"
          >
            {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="pl-4 border-l-2 border-gray-200 dark:border-white/10 mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Webhook className="w-4 h-4 inline mr-2" />
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-webhook.com/notify"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-white/15 border border-gray-200 dark:border-white/20 rounded-xl hover:bg-gray-200 dark:hover:bg-white/25 text-gray-800 dark:text-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" />
              Preview
            </button>
            
            <button
              type="button"
              onClick={() => handleStartMigration()}
              disabled={loading || !migrationName.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {isDryRun ? 'Run Preview' : 'Start Migration'}
                </>
              )}
            </button>
          </div>
        </GlassCard>
      )}

      {
}
      {activeMigration && activeMigration.status === 'in_progress' && (
        <GlassCard className="p-6 mb-6" gradient>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Loader className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Migration in Progress</h3>
            </div>
            <button
              onClick={() => handleCancelMigration(activeMigration.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
          
          <div className="flex items-center gap-8">
            <ProgressRing progress={activeMigration.progress_percentage} />
            
            <div className="flex-1 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {activeMigration.current_step || 'Processing...'}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="text-gray-500 mb-1">Tables</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {activeMigration.completed_tables} / {activeMigration.total_tables}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="text-gray-500 mb-1">Rows</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {activeMigration.migrated_rows.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {
}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={() => setLiveLogsOpen(!liveLogsOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3"
            >
              <Terminal className="w-4 h-4" />
              {liveLogsOpen ? 'Hide' : 'Show'} Live Logs
              {liveLogsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {liveLogsOpen && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="space-y-1">
                    <div className="text-gray-500 animate-pulse">Waiting for logs...</div>
                    {activeMigration?.current_step && (
                      <div className="text-amber-400/90">→ {activeMigration.current_step}</div>
                    )}
                    {activeMigration?.progress_percentage != null && (
                      <div className="text-gray-400">{Math.round(activeMigration.progress_percentage)}%</div>
                    )}
                  </div>
                ) : logs.map((log, idx) => (
                  <div key={idx} className="mb-1">{typeof log === 'string' ? log : log.message || JSON.stringify(log)}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {
}
      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-500/10">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Migration History</h3>
          </div>
        </div>

        {migrations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
              <Database className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No migrations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Migration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {migrations.map(migration => (
                  <tr key={migration.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{migration.migration_name}</div>
                      <div className="text-sm text-gray-500">{new Date(migration.created_at).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(migration.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all"
                            style={{ width: `${migration.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{migration.progress_percentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {migration.duration_seconds ? `${migration.duration_seconds.toFixed(1)}s` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fetchMigrationLogs(migration.id)}
                          className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                          title="View Logs"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {migration.status === 'completed' && migration.can_rollback && (
                          <button
                            type="button"
                            onClick={() => handleRollback(migration.id)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Rollback"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {
}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Migration Preview</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Source</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300">{previewData.source.db_type} - {previewData.source.database}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">{previewData.source.tables.length} tables</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Target</h4>
                  <p className="text-sm text-green-600 dark:text-green-300">{previewData.target.db_type} - {previewData.target.database}</p>
                  <p className="text-sm text-green-600 dark:text-green-300">{previewData.target.existing_tables.length} existing tables</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Migration Plan</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total rows:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">{previewData.migration_plan.total_rows.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tables to create:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">{previewData.migration_plan.tables_to_create.length}</span>
                  </div>
                </div>
              </div>

              {previewData.migration_plan.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-xl">
                  <h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warnings
                  </h4>
                  <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-300 space-y-1">
                    {previewData.migration_plan.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {
}
      {showLogs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Migration Logs
              </h3>
              <button onClick={() => setShowLogs(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs available</div>
                ) : logs.map((log, idx) => (
                  <div key={idx} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {showCredentialsModal && (
        <DBCredentialsModal
          title="Database credentials for new target"
          onClose={() => { setShowCredentialsModal(false); setPendingMigrationData(null); }}
          onConfirm={handleMigrationCredentialsConfirm}
        />
      )}

      {
}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

