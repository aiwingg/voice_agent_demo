import React, { useState, useEffect } from 'react';

const OrderHistory = ({ telegramId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (telegramId) {
      fetchOrders();
    }
  }, [telegramId]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Make real API call
      const response = await fetch(`https://aiwingg.com/rag/get_orders?client_number=${telegramId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // Sort orders by created_at date (newest first)
      const sortedOrders = data.sort((a, b) => 
        new Date(b.cart.created_at) - new Date(a.cart.created_at)
      );
      
      setOrders(sortedOrders);
    } catch (err) {
      setError('Ошибка при загрузке истории заказов: ' + err.message);
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (sessionId) => {
    setExpandedOrder(expandedOrder === sessionId ? null : sessionId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(price);
  };

  if (!telegramId) {
    return (
      <div style={styles.container}>
        <div style={styles.noDataMessage}>
          Введите Telegram ID для просмотра истории заказов
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>История заказов</h2>
        <button onClick={fetchOrders} style={styles.refreshButton} disabled={loading}>
          {loading ? '⏳' : '🔄'} Обновить
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>
          Загрузка заказов...
        </div>
      ) : orders.length === 0 ? (
        <div style={styles.noDataMessage}>
          Заказы не найдены
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Дата заказа</th>
                <th style={styles.th}>ID сессии</th>
                <th style={styles.th}>Сумма</th>
                <th style={styles.th}>Товаров</th>
                <th style={styles.th}>Дата доставки</th>
                <th style={styles.th}>Статус</th>
                <th style={styles.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order.session_id}>
                  <tr 
                    style={{
                      ...styles.row,
                      ...(expandedOrder === order.session_id ? styles.expandedRow : {})
                    }}
                  >
                    <td style={styles.td}>
                      {formatDate(order.cart.created_at)}
                    </td>
                    <td style={styles.td}>
                      {order.session_id.substring(0, 8)}...
                    </td>
                    <td style={styles.td}>
                      {formatPrice(order.cart.cart.total_cost)}
                    </td>
                    <td style={styles.td}>
                      {order.cart.cart.total_items}
                    </td>
                    <td style={styles.td}>
                      {new Date(order.cart.cart.delivery_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge}>
                        {order.cart.cart.cart_type === 'preliminary' ? 'Предварительный' : 'Подтвержден'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => toggleOrderExpansion(order.session_id)}
                        style={styles.expandButton}
                      >
                        {expandedOrder === order.session_id ? '▼' : '▶'} Детали
                      </button>
                    </td>
                  </tr>
                  {expandedOrder === order.session_id && (
                    <tr>
                      <td colSpan="7" style={styles.expandedContent}>
                        <div style={styles.orderDetails}>
                          <div style={styles.orderInfo}>
                            <div style={styles.infoSection}>
                              <strong>Клиент:</strong> {order.cart.cart.client_name}
                            </div>
                            <div style={styles.infoSection}>
                              <strong>Адрес доставки:</strong> {order.cart.cart.location}
                            </div>
                            <div style={styles.infoSection}>
                              <strong>Телефоны:</strong> {order.cart.phone_numbers.join(', ')}
                            </div>
                          </div>

                          <div style={styles.itemsHeader}>
                            <h5>Товары в заказе:</h5>
                          </div>
                          
                          <div style={styles.itemsList}>
                            {order.cart.cart.items.map((item, index) => (
                              <div key={index} style={styles.item}>
                                <div style={styles.itemName}>
                                  <strong>{item.product.nomenclatureName}</strong>
                                </div>
                                <div style={styles.itemDetails}>
                                  <span>Животное: {item.product.animal}</span> •{' '}
                                  <span>Объект: {item.product.object}</span> •{' '}
                                  <span>Упаковка: {item.packaging_type.type} ({item.packaging_type.quantity})</span> •{' '}
                                  <span>Температура: {item.product.temperature}</span>
                                </div>
                                <div style={styles.itemPrice}>
                                  <span>Количество: {item.quantity}</span> •{' '}
                                  <span>Цена за {item.product.quant}: {formatPrice(item.product.price)}</span> •{' '}
                                  <strong>Итого: {formatPrice(item.calculated_price)}</strong>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div style={styles.totalSection}>
                            <strong>Общая сумма заказа: {formatPrice(order.cart.cart.total_cost)}</strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: "'Montserrat', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.8rem',
    color: '#333',
    margin: 0,
  },
  refreshButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(90deg, #0044CC, #0056D2)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'transform 0.2s',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fcc',
  },
  loading: {
    textAlign: 'center',
    fontSize: '1.2rem',
    color: '#666',
    padding: '40px',
  },
  noDataMessage: {
    textAlign: 'center',
    fontSize: '1.1rem',
    color: '#666',
    padding: '40px',
    background: '#f9f9f9',
    borderRadius: '8px',
  },
  tableContainer: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    background: 'linear-gradient(90deg, #0044CC, #0056D2)',
    color: 'white',
  },
  th: {
    padding: '15px 12px',
    textAlign: 'left',
    fontWeight: '600',
  },
  row: {
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  expandedRow: {
    background: '#f8f9fa',
  },
  td: {
    padding: '15px 12px',
    verticalAlign: 'middle',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    background: '#e3f2fd',
    color: '#1976d2',
  },
  expandButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
  },
  expandedContent: {
    padding: '0',
    background: '#f8f9fa',
  },
  orderDetails: {
    padding: '20px',
  },
  detailsHeader: {
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '2px solid #ddd',
  },
  orderInfo: {
    marginBottom: '20px',
  },
  infoSection: {
    marginBottom: '8px',
    fontSize: '0.95rem',
  },
  itemsHeader: {
    marginBottom: '15px',
  },
  itemsList: {
    marginBottom: '20px',
  },
  item: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e0e0e0',
  },
  itemName: {
    marginBottom: '8px',
    fontSize: '1.1rem',
    color: '#333',
  },
  itemDetails: {
    marginBottom: '6px',
    fontSize: '0.9rem',
    color: '#666',
  },
  itemPrice: {
    marginBottom: '6px',
    fontSize: '0.95rem',
    color: '#333',
  },
  itemPackaging: {
    fontSize: '0.85rem',
    color: '#888',
    fontStyle: 'italic',
  },
  totalSection: {
    textAlign: 'right',
    fontSize: '1.2rem',
    color: '#0044CC',
    paddingTop: '15px',
    borderTop: '2px solid #ddd',
  },
};

export default OrderHistory;
