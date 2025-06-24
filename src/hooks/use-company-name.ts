
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompany } from '@/lib/data-service';

export function useCompanyName() {
  const { currentCompanyId } = useAuth();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) {
      setCompanyName(null);
      return;
    }

    const fetchCompanyName = async () => {
      setIsLoading(true);
      try {
        const company = await getCompany(currentCompanyId);
        setCompanyName(company?.name || 'Unknown Company');
      } catch (error) {
        console.error('Error fetching company name:', error);
        setCompanyName('Unknown Company');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyName();
  }, [currentCompanyId]);

  return { companyName, isLoading };
}
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCompany } from '@/lib/data-service';

export function useCompanyName() {
  const { currentCompanyId } = useAuth();
  const [companyName, setCompanyName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchCompanyName() {
      if (!currentCompanyId) {
        setCompanyName('');
        return;
      }

      setIsLoading(true);
      try {
        const company = await getCompany(currentCompanyId);
        setCompanyName(company?.name || '');
      } catch (error) {
        console.error('Failed to fetch company name:', error);
        setCompanyName('');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCompanyName();
  }, [currentCompanyId]);

  return { companyName, isLoading };
}
