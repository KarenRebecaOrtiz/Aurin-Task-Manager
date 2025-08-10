import { render, fireEvent, screen } from '@testing-library/react';
import TagDropdown, { TagItem } from '@/components/ui/TagDropdown';

// Mock de framer-motion para tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock de next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => <img src={src} alt={alt} {...props} />,
}));

describe('TagDropdown', () => {
  const mockItems: TagItem[] = [
    {
      id: 'gemini',
      name: '@gemini',
      type: 'ai',
      svgIcon: '<svg>gemini-icon</svg>',
    },
    {
      id: 'user1',
      name: 'Usuario 1',
      type: 'user',
      imageUrl: '/avatar1.jpg',
    },
  ];

  const mockOnSelectionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders mentions correctly', () => {
    render(
      <TagDropdown
        items={mockItems}
        onSelectionChange={mockOnSelectionChange}
        isOpenDefault={true}
      />
    );

    expect(screen.getByText('@gemini')).toBeInTheDocument();
    expect(screen.getByText('Usuario 1')).toBeInTheDocument();
  });

  test('filters by mention type when specified', () => {
    render(
      <TagDropdown
        items={mockItems}
        onSelectionChange={mockOnSelectionChange}
        mentionType="ai"
        isOpenDefault={true}
      />
    );

    expect(screen.getByText('@gemini')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 1')).not.toBeInTheDocument();
  });

  test('handles item selection correctly', () => {
    render(
      <TagDropdown
        items={mockItems}
        onSelectionChange={mockOnSelectionChange}
        isOpenDefault={true}
      />
    );

    const geminiItem = screen.getByText('@gemini');
    fireEvent.click(geminiItem);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      { id: 'gemini', type: 'ai' }
    ]);
  });

  test('shows AI badge for AI type items', () => {
    render(
      <TagDropdown
        items={mockItems}
        onSelectionChange={mockOnSelectionChange}
        isOpenDefault={true}
      />
    );

    const aiBadge = screen.getByText('AI');
    expect(aiBadge).toBeInTheDocument();
  });

  test('handles search functionality', () => {
    render(
      <TagDropdown
        items={mockItems}
        onSelectionChange={mockOnSelectionChange}
        isOpenDefault={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'gemini' } });

    expect(screen.getByText('@gemini')).toBeInTheDocument();
    expect(screen.queryByText('Usuario 1')).not.toBeInTheDocument();
  });
});
