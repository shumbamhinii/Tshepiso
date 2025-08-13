import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompetitorPrice, PricingProduct } from "@/types/pricing";
import { Users, Plus, Trash2, Download } from "lucide-react";
import { useState } from "react";

interface CompetitorsTabProps {
  products: PricingProduct[];
  competitorPrices: CompetitorPrice[];
  onCompetitorPricesChange: (prices: CompetitorPrice[]) => void;
}

export default function CompetitorsTab({ products, competitorPrices, onCompetitorPricesChange }: CompetitorsTabProps) {
  const [newPrice, setNewPrice] = useState<Partial<CompetitorPrice>>({
    productId: '',
    competitorName: '',
    price: 0,
    source: '',
    notes: ''
  });

  const addCompetitorPrice = () => {
    if (newPrice.productId && newPrice.competitorName && newPrice.price) {
      const price: CompetitorPrice = {
        productId: newPrice.productId,
        competitorName: newPrice.competitorName,
        price: newPrice.price,
        source: newPrice.source,
        notes: newPrice.notes
      };
      onCompetitorPricesChange([...competitorPrices, price]);
      setNewPrice({
        productId: '',
        competitorName: '',
        price: 0,
        source: '',
        notes: ''
      });
    }
  };

  const removeCompetitorPrice = (index: number) => {
    onCompetitorPricesChange(competitorPrices.filter((_, i) => i !== index));
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getCompetitorPricesForProduct = (productId: string) => {
    return competitorPrices.filter(cp => cp.productId === productId);
  };

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Competitor Pricing</h2>
            <p className="text-muted-foreground mt-1">Track and analyze competitor pricing data</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Add Competitor Price */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Plus className="w-5 h-5 mr-2 text-primary" />
                Add Competitor Price
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-select">Product</Label>
                  <select
                    id="product-select"
                    value={newPrice.productId || ''}
                    onChange={(e) => setNewPrice({...newPrice, productId: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Select a product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name || 'Unnamed Product'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="competitor-name">Competitor Name</Label>
                  <Input
                    id="competitor-name"
                    value={newPrice.competitorName || ''}
                    onChange={(e) => setNewPrice({...newPrice, competitorName: e.target.value})}
                    placeholder="e.g., CompanyABC"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="competitor-price">Price</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="competitor-price"
                      type="number"
                      value={newPrice.price || ''}
                      onChange={(e) => setNewPrice({...newPrice, price: parseFloat(e.target.value) || 0})}
                      className="pl-8"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="price-source">Source</Label>
                  <Input
                    id="price-source"
                    value={newPrice.source || ''}
                    onChange={(e) => setNewPrice({...newPrice, source: e.target.value})}
                    placeholder="e.g., Website, Store visit"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addCompetitorPrice} disabled={!newPrice.productId || !newPrice.competitorName || !newPrice.price}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Price
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="price-notes">Notes</Label>
                <Input
                  id="price-notes"
                  value={newPrice.notes || ''}
                  onChange={(e) => setNewPrice({...newPrice, notes: e.target.value})}
                  placeholder="Additional notes about this price point"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Competitor Prices Table */}
          {competitorPrices.length > 0 ? (
            <Card className="pricing-form-section">
              <CardHeader>
                <CardTitle className="text-lg">Competitor Pricing Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>Competitor</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitorPrices.map((price, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell>{getProductName(price.productId)}</TableCell>
                          <TableCell>{price.competitorName}</TableCell>
                          <TableCell>${price.price.toFixed(2)}</TableCell>
                          <TableCell>{price.source || '-'}</TableCell>
                          <TableCell>{price.notes || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCompetitorPrice(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No competitor pricing data</h3>
                <p className="text-sm text-muted-foreground">Add competitor prices to analyze market positioning</p>
              </CardContent>
            </Card>
          )}

          {/* Price Comparison Analysis */}
          {products.length > 0 && competitorPrices.length > 0 && (
            <Card className="pricing-form-section">
              <CardHeader>
                <CardTitle className="text-lg">Price Comparison Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.map(product => {
                    const productPrices = getCompetitorPricesForProduct(product.id);
                    if (productPrices.length === 0) return null;

                    const avgPrice = productPrices.reduce((sum, cp) => sum + cp.price, 0) / productPrices.length;
                    const minPrice = Math.min(...productPrices.map(cp => cp.price));
                    const maxPrice = Math.max(...productPrices.map(cp => cp.price));

                    return (
                      <div key={product.id} className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">{product.name || 'Unnamed Product'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Your Price:</span>
                            <span className="ml-2 font-medium">${product.costPerUnit.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Competitor:</span>
                            <span className="ml-2 font-medium">${avgPrice.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Min Price:</span>
                            <span className="ml-2 font-medium">${minPrice.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Price:</span>
                            <span className="ml-2 font-medium">${maxPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
